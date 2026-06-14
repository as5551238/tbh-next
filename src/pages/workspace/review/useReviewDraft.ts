import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatMessage, chatCompletion } from '@/lib/aiService';
import { REVIEW_MODELS, recommendModels, buildReviewDraftPrompt, snapshotGoalProgress, getReviewSnapshot, computeReviewEffectiveness, computePerformanceScore, type ReviewModel, type ReviewSession, type DeviationAlert, type ReviewEffectiveness } from '@/lib/reviewEngine';
import { createActionItem, fetchActionItems, updateActionItem, createTask, type ActionItemRow, createReviewSession, updateReviewSession, fetchReviewSessions, type ReviewSessionRow } from '@/lib/dataLayer';
import { linkReviewToSeason } from '@/lib/dsteEngine';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

type Phase = 'alerts' | 'pick' | 'guide' | 'draft' | 'done';

/** Convert ReviewSession (app type) → ReviewSessionRow (DB type) */
function toRow(s: ReviewSession): Omit<ReviewSessionRow, 'created_at' | 'updated_at'> {
  return {
    id: s.id,
    model_id: s.modelId,
    target_type: s.targetType,
    target_id: s.targetId,
    target_title: s.targetTitle,
    current_step: s.currentStep,
    inputs: s.inputs,
    status: s.status,
    draft: s.draft,
    action_items: s.actionItems,
    effectiveness_score: null,
    performance_score: null,
    team_id: '__default__',
  };
}

/** Convert ReviewSessionRow (DB type) → ReviewSession (app type) */
function fromRow(r: ReviewSessionRow): ReviewSession {
  return {
    id: r.id,
    modelId: r.model_id as ReviewModel['id'],
    targetType: r.target_type as ReviewSession['targetType'],
    targetId: r.target_id,
    targetTitle: r.target_title,
    currentStep: r.current_step,
    inputs: r.inputs,
    status: r.status,
    draft: r.draft,
    actionItems: Array.isArray(r.action_items) ? r.action_items : [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function useReviewDraft(
  industry: string,
  dept: string,
  goals: { id: string; title: string; progress: number; end_date?: string | null }[],
  tasks: { goal_id?: string | null; status: string; priority?: string | null; due_date?: string | null; completed_at?: string | null; done?: boolean }[],
) {
  const [phase, setPhase] = useState<Phase>('alerts');
  const [selectedModel, setSelectedModel] = useState<ReviewModel | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<DeviationAlert | null>(null);
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [actionItems, setActionItems] = useState<ActionItemRow[]>([]);
  const [isSavingActions, setIsSavingActions] = useState(false);
  const [recentSessions, setRecentSessions] = useState<ReviewSessionRow[]>([]);

  // Debounced persist to Supabase — avoids writing on every keystroke
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistToDb = useCallback((s: ReviewSession) => {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(async () => {
      try {
        await updateReviewSession(s.id, toRow(s));
      } catch { /* silent — offline resilience */ }
    }, 2000);
  }, []);

  // Immediate persist (for phase transitions — no debounce)
  const persistNow = useCallback(async (s: ReviewSession) => {
    try {
      await updateReviewSession(s.id, toRow(s));
    } catch { /* silent */ }
  }, []);

  // Load recent sessions for history display
  const loadRecentSessions = useCallback(async () => {
    try {
      const rows = await fetchReviewSessions();
      setRecentSessions(rows);
    } catch { /* silent */ }
  }, []);

  // Resume an existing session from DB
  const resumeSession = useCallback((row: ReviewSessionRow) => {
    const s = fromRow(row);
    setSession(s);
    const model = REVIEW_MODELS.find((m) => m.id === s.modelId) ?? REVIEW_MODELS[0];
    setSelectedModel(model);
    if (s.status === 'completed') {
      setPhase('done');
    } else if (s.status === 'draft_ready') {
      setPhase('draft');
    } else if (s.status === 'in_progress' && s.currentStep > 0) {
      setPhase('guide');
    } else {
      setPhase('pick');
    }
  }, []);

  // Load action items on mount
  useEffect(() => {
    void loadActionItems();
    void loadRecentSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 加载已有 ActionItem
  const loadActionItems = useCallback(async () => {
    try {
      const items = await fetchActionItems();
      setActionItems(items);
    } catch { /* intentionally silent */ }
  }, []);

  // 从复盘草稿中提取行动项
  const extractActionItems = useCallback((draft: string): string[] => {
    const lines = draft.split('\n');
    const items: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^[-*]\s+\[[ x]\]\s+/.test(trimmed)) {
        items.push(trimmed.replace(/^[-*]\s+\[[ x]\]\s+/, ''));
      } else if (/^[-*]\s+(?:行动|措施|改进|建议|TODO|Action)[：:]/i.test(trimmed)) {
        items.push(trimmed.replace(/^[-*]\s+/, ''));
      }
    }
    if (items.length === 0) {
      const actionSection = draft.match(/(?:行动|措施|改进|下一步)[^\n]*\n([\s\S]*?)(?=\n#|\n$|$)/i);
      if (actionSection) {
        const actionLines = actionSection[1].split('\n');
        for (const al of actionLines) {
          const clean = al.trim().replace(/^[-*\d.)\s]+/, '');
          if (clean.length > 5) items.push(clean);
        }
      }
    }
    return items;
  }, []);

  // 保存 ActionItems 到 DB
  const saveActionItems = useCallback(async (draft: string, goalId: string | null, sourceId: string) => {
    setIsSavingActions(true);
    try {
      const extracted = extractActionItems(draft);
      const newItems: ActionItemRow[] = [];
      for (const itemText of extracted.slice(0, 5)) {
        try {
          const item = await createActionItem({
            title: itemText.slice(0, 100),
            description: itemText,
            source: 'review',
            source_id: sourceId,
            goal_id: goalId,
            assignee_id: null,
            status: 'open',
            priority: 'medium',
            due_date: null,
            completed_at: null,
            closed_loop: false,
            team_id: '__default__',
            created_by: null,
          });
          newItems.push(item);
        } catch { /* Skip if RLS blocks */ }
      }
      if (newItems.length === 0) {
        try {
          const item = await createActionItem({
            title: `复盘行动：${sourceId}`,
            description: `基于复盘草稿的行动计划，请查看复盘报告了解详情。`,
            source: 'review',
            source_id: sourceId,
            goal_id: goalId,
            assignee_id: null,
            status: 'open',
            priority: 'medium',
            due_date: null,
            completed_at: null,
            closed_loop: false,
            team_id: '__default__',
            created_by: null,
          });
          newItems.push(item);
        } catch { /* Skip if RLS blocks */ }
      }
      setActionItems((prev) => [...newItems, ...prev]);
    } finally {
      setIsSavingActions(false);
    }
  }, [extractActionItems]);

  // 开始复盘
  const startReview = useCallback((alert: DeviationAlert) => {
    setSelectedAlert(alert);
    const ctx = {
      targetTitle: alert.targetTitle,
      targetType: alert.targetType,
      progress: alert.progress,
      status: 'active' as const,
      deviationPercent: alert.deviationPercent,
      tags: [alert.severity === 'danger' ? '严重偏差' : '轻度偏差', alert.isOverdue ? '逾期' : ''],
      daysRemaining: 0,
      isOverdue: alert.isOverdue,
    };
    const recs = recommendModels(ctx);
    setSelectedModel(recs.length > 0 ? recs[0].model : REVIEW_MODELS[0]);
    setPhase('pick');
  }, []);

  // 手动选择模型 → 创建 session 并写入 Supabase
  const pickModel = useCallback(async (model: ReviewModel) => {
    setSelectedModel(model);
    const s: ReviewSession = {
      id: `rev_${Date.now()}`,
      modelId: model.id,
      targetType: selectedAlert?.targetType ?? 'goal',
      targetId: selectedAlert?.targetId ?? '',
      targetTitle: selectedAlert?.targetTitle ?? '手动复盘',
      currentStep: 0,
      inputs: {},
      status: 'in_progress',
      draft: '',
      actionItems: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSession(s);
    setPhase('guide');
    // Persist to Supabase
    try {
      await createReviewSession({ ...toRow(s), created_at: s.createdAt, updated_at: s.updatedAt });
      void loadRecentSessions();
    } catch { /* offline resilience */ }
  }, [selectedAlert, loadRecentSessions]);

  // 分步引导 — debounced persist
  const handleStepInput = useCallback((stepId: string, value: string) => {
    setSession((prev) => {
      if (!prev) return null;
      const updated = { ...prev, inputs: { ...prev.inputs, [stepId]: value } };
      persistToDb(updated);
      return updated;
    });
  }, [persistToDb]);

  const nextStep = useCallback(() => {
    if (!session || !selectedModel) return;
    const nextIdx = session.currentStep + 1;
    if (nextIdx >= selectedModel.steps.length) {
      generateDraft();
    } else {
      setSession((prev) => {
        if (!prev) return null;
        const updated = { ...prev, currentStep: nextIdx };
        void persistNow(updated);
        return updated;
      });
    }
  }, [session, selectedModel]); // eslint-disable-line react-hooks/exhaustive-deps

  const prevStep = useCallback(() => {
    if (!session) return;
    setSession((prev) => {
      if (!prev) return null;
      const updated = { ...prev, currentStep: Math.max(0, prev.currentStep - 1) };
      void persistNow(updated);
      return updated;
    });
  }, [session, persistNow]);

  // AI生成复盘草稿
  const generateDraft = useCallback(async () => {
    if (!session || !selectedModel) return;
    setIsGenerating(true);
    try {
      const prompt = buildReviewDraftPrompt(selectedModel, session, industry, dept);
      const messages: ChatMessage[] = [
        { role: 'system', content: '你是专业的团队复盘助手，请根据用户输入生成结构化复盘报告。' },
        { role: 'user', content: prompt },
      ];
      const res = await chatCompletion(messages);
      setSession((prev) => {
        if (!prev) return null;
        const updated = { ...prev, draft: res.text, status: 'draft_ready' as const };
        void persistNow(updated);
        return updated;
      });
      setPhase('draft');
    } catch {
      const fallback = selectedModel.steps
        .map((s) => `## ${s.title}\n${session.inputs[s.id] || '（未填写）'}`)
        .join('\n\n');
      setSession((prev) => {
        if (!prev) return null;
        const updated = { ...prev, draft: fallback, status: 'draft_ready' as const };
        void persistNow(updated);
        return updated;
      });
      setPhase('draft');
    } finally {
      setIsGenerating(false);
    }
  }, [session, selectedModel, industry, dept, persistNow]);

  // 完成复盘 — primary persist via review_sessions table
  const completeReview = useCallback(() => {
    if (session && session.draft) {
      if (session.targetId) {
        const goal = goals.find((g) => g.id === session.targetId);
        if (goal) snapshotGoalProgress(session.id, session.targetId, goal.progress);
      }
      linkReviewToSeason(session.id, session.targetId || undefined);
      saveActionItems(session.draft, session.targetId, session.id);
      // Persist completed session to Supabase (primary store, replaces behavior_events side channel)
      const updated = { ...session, status: 'completed' as const };
      void persistNow(updated);
      setSession(updated);
      void loadRecentSessions();
    }
    setPhase('done');
  }, [session, goals, saveActionItems, persistNow, loadRecentSessions]);

  // 更新行动项状态
  const toggleActionItem = useCallback(async (ai: ActionItemRow) => {
    const newStatus = ai.status === 'completed' ? 'open' : 'completed';
    try {
      const updated = await updateActionItem(ai.id, {
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
        closed_loop: newStatus === 'completed' && !!ai.goal_id,
      });
      setActionItems((prev) => prev.map((p) => p.id === ai.id ? updated : p));
    } catch { /* ignore */ }
  }, []);

  // 转为任务
  const convertToTask = useCallback(async (ai: ActionItemRow) => {
    await createTask({
      title: ai.title,
      description: ai.description,
      goal_id: ai.goal_id,
      assignee_id: ai.assignee_id,
      priority: ai.priority,
      done: false,
      status: 'todo',
    } as unknown as Parameters<typeof createTask>[0]);
    await updateActionItem(ai.id, { status: 'completed', closed_loop: true, completed_at: new Date().toISOString() });
    setActionItems((prev) => prev.map((p) => p.id === ai.id ? { ...p, status: 'completed', closed_loop: true } : p));
  }, []);

  // 重置
  const resetReview = useCallback(() => {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    setPhase('alerts');
    setSession(null);
    setSelectedAlert(null);
  }, []);

  return {
    phase, setPhase, selectedModel, selectedAlert, setSelectedAlert, setSelectedModel,
    session, isGenerating, isSavingActions, actionItems, recentSessions,
    startReview, pickModel, handleStepInput, nextStep, prevStep, generateDraft,
    completeReview, loadActionItems, toggleActionItem, convertToTask, resetReview,
    resumeSession, loadRecentSessions,
  };
}
