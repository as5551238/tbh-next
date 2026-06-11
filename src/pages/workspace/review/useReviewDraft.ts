import { useState, useCallback } from 'react';
import { ChatMessage, chatCompletion } from '@/lib/aiService';
import { REVIEW_MODELS, recommendModels, buildReviewDraftPrompt, snapshotGoalProgress, getReviewSnapshot, computeReviewEffectiveness, computePerformanceScore, type ReviewModel, type ReviewSession, type DeviationAlert, type ReviewEffectiveness } from '@/lib/reviewEngine';
import { createActionItem, fetchActionItems, updateActionItem, createTask, type ActionItemRow } from '@/lib/dataLayer';
import { linkReviewToSeason } from '@/lib/dsteEngine';

type Phase = 'alerts' | 'pick' | 'guide' | 'draft' | 'done';

export function useReviewDraft(
  industry: string,
  dept: string,
  goals: { id: string; title: string; progress: number; end_date?: string }[],
  tasks: { goal_id?: string; status: string; priority?: string; due_date?: string; completed_at?: string; done?: boolean }[],
) {
  const [phase, setPhase] = useState<Phase>('alerts');
  const [selectedModel, setSelectedModel] = useState<ReviewModel | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<DeviationAlert | null>(null);
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [actionItems, setActionItems] = useState<ActionItemRow[]>([]);
  const [isSavingActions, setIsSavingActions] = useState(false);

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

  // 手动选择模型
  const pickModel = useCallback((model: ReviewModel) => {
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
  }, [selectedAlert]);

  // 分步引导
  const handleStepInput = useCallback((stepId: string, value: string) => {
    setSession((prev) => prev ? { ...prev, inputs: { ...prev.inputs, [stepId]: value } } : null);
  }, []);

  const nextStep = useCallback(() => {
    if (!session || !selectedModel) return;
    const nextIdx = session.currentStep + 1;
    if (nextIdx >= selectedModel.steps.length) {
      generateDraft();
    } else {
      setSession((prev) => prev ? { ...prev, currentStep: nextIdx } : null);
    }
  }, [session, selectedModel]);

  const prevStep = useCallback(() => {
    if (!session) return;
    setSession((prev) => prev ? { ...prev, currentStep: Math.max(0, prev.currentStep - 1) } : null);
  }, [session]);

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
      setSession((prev) => prev ? { ...prev, draft: res.text, status: 'draft_ready' } : null);
      setPhase('draft');
    } catch {
      const fallback = selectedModel.steps
        .map((s) => `## ${s.title}\n${session.inputs[s.id] || '（未填写）'}`)
        .join('\n\n');
      setSession((prev) => prev ? { ...prev, draft: fallback, status: 'draft_ready' } : null);
      setPhase('draft');
    } finally {
      setIsGenerating(false);
    }
  }, [session, selectedModel, industry, dept]);

  // 完成复盘
  const completeReview = useCallback(() => {
    if (session && session.draft) {
      if (session.targetId) {
        const goal = goals.find((g) => g.id === session.targetId);
        if (goal) snapshotGoalProgress(session.id, session.targetId, goal.progress);
      }
      linkReviewToSeason(session.id, session.targetId || undefined);
      saveActionItems(session.draft, session.targetId, session.id);
    }
    setPhase('done');
  }, [session, goals, saveActionItems]);

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
    await updateActionItem(ai.id, { status: 'completed', closed_loop: true });
    setActionItems((prev) => prev.map((p) => p.id === ai.id ? { ...p, status: 'completed', closed_loop: true } : p));
  }, []);

  // 重置
  const resetReview = useCallback(() => {
    setPhase('alerts');
    setSession(null);
    setSelectedAlert(null);
  }, []);

  return {
    phase, setPhase, selectedModel, selectedAlert, setSelectedAlert, setSelectedModel,
    session, isGenerating, isSavingActions, actionItems,
    startReview, pickModel, handleStepInput, nextStep, prevStep, generateDraft,
    completeReview, loadActionItems, toggleActionItem, convertToTask, resetReview,
  };
}
