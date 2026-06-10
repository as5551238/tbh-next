import { CardSkeleton } from '@/components/Skeleton';
import { useGateCheck } from '@/hooks/useGateCheck';
import PaywallModal from '@/components/PaywallModal';
import { hasFeature } from '@/lib/subscription';
const PRO_FEATURES = { deepReview: hasFeature('customWorkflows' as never), customReport: hasFeature('advancedAnalytics' as never), automation: hasFeature('customWorkflows' as never), prediction: hasFeature('advancedAnalytics' as never), statusFlow: hasFeature('customWorkflows' as never), knowledge: hasFeature('advancedAnalytics' as never), aiQuery: hasFeature('advancedAnalytics' as never) };
import { useState, useCallback, useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';
import { useGoals, useTasks, useActionItems } from '@/hooks/useMatrix';
import { ChatMessage, chatCompletion } from '@/lib/aiService';
import {
  REVIEW_MODELS, recommendModels, detectDeviations, computeAutoProgress, buildReviewDraftPrompt, computePerformanceScore,
  type ReviewModel, type ReviewSession, type DeviationAlert,
} from '@/lib/reviewEngine';
import {
  createActionItem, fetchActionItems, updateActionItem,
  createTask,
  createDeviationAlert, fetchDeviationAlerts, updateDeviationAlert,
  type ActionItemRow, type DeviationAlertRow,
} from '@/lib/dataLayer';
import { cn } from '@/lib/utils';
import { btnPrimary, btnSecondary, inputCls } from '@/components/Modal';
import { RotateCcw, AlertTriangle, ChevronRight, Loader2, Sparkles, CheckCircle2, ArrowRight, FileText, Lightbulb, ListChecks, X, Zap } from 'lucide-react';

type Phase = 'alerts' | 'pick' | 'guide' | 'draft' | 'done';

export default function ReviewContent() {
  const { showPaywall: rvShow, paywallReason: rvReason, paywallFeature: rvFeat, closePaywall: rvClose, requireFeature: rvRequire } = useGateCheck();
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);
  const { goals, loading: goalsLoading } = useGoals();
  const { tasks } = useTasks();

  const [phase, setPhase] = useState<Phase>('alerts');
  const [alerts, setAlerts] = useState<DeviationAlert[]>([]);
  const [selectedModel, setSelectedModel] = useState<ReviewModel | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<DeviationAlert | null>(null);
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [actionItems, setActionItems] = useState<ActionItemRow[]>([]);
  const [persistedAlerts, setPersistedAlerts] = useState<DeviationAlertRow[]>([]);
  const [isSavingActions, setIsSavingActions] = useState(false);

  // 计算偏差
  const computeAlerts = useCallback(() => {
    const goalItems = goals.map((g) => ({
      id: g.id, title: g.title, progress: g.progress,
      startDate: g.start_date, endDate: g.end_date, type: 'goal' as const,
    }));
    const allAlerts = detectDeviations(goalItems);
    setAlerts(allAlerts);
    setPhase('alerts');
  }, [goals]);

  // 隐性闭环：mount 时自动计算偏差
  useEffect(() => {
    if (!goalsLoading) computeAlerts();
  }, [goalsLoading, computeAlerts]);

  // 持久化：同步内存告警到 DB，并加载持久化告警
  useEffect(() => {
    if (alerts.length === 0) return;
    const syncAlerts = async () => {
      // Load existing persisted alerts
      const existing = await fetchDeviationAlerts(true);
      setPersistedAlerts(existing);

      // Sync new alerts that aren't already in DB
      for (const alert of alerts) {
        const alreadyExists = existing.some(
          (ea) => ea.goal_id === alert.targetId && ea.alert_type === alert.id && !ea.is_resolved
        );
        if (!alreadyExists && alert.targetId) {
          try {
            const created = await createDeviationAlert({
              goal_id: alert.targetId,
              task_id: null,
              alert_type: alert.id,
              severity: alert.severity === 'danger' ? 'critical' : alert.severity === 'warn' ? 'warning' : 'info',
              message: alert.message,
              is_read: false,
              is_resolved: false,
              resolved_at: null,
              action_item_id: null,
              team_id: '__default__',
            });
            setPersistedAlerts((prev) => [created, ...prev]);
          } catch {
            // Silently skip if RLS blocks insert
          }
        }
      }
    };
    syncAlerts();
  }, [alerts]);

  // 加载已有 ActionItem
  useEffect(() => {
    fetchActionItems().then(setActionItems).catch((_e) => { /* fetchActionItems: intentionally silently fail */ });
  }, []);

  // 从复盘草稿中提取行动项
  const extractActionItems = useCallback((draft: string, goalId: string | null, sourceId: string): string[] => {
    const lines = draft.split('\n');
    const items: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      // Match markdown checkbox items or bullet points that look like actions
      if (/^[-*]\s+\[[ x]\]\s+/.test(trimmed)) {
        items.push(trimmed.replace(/^[-*]\s+\[[ x]\]\s+/, ''));
      } else if (/^[-*]\s+(?:行动|措施|改进|建议|TODO|Action)[：:]/i.test(trimmed)) {
        items.push(trimmed.replace(/^[-*]\s+/, ''));
      }
    }
    // If no structured items found, extract from "行动" section
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
      const extracted = extractActionItems(draft, goalId, sourceId);
      const newItems: ActionItemRow[] = [];
      for (const itemText of extracted.slice(0, 5)) { // Max 5 items per review
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
        } catch {
          // Skip if RLS blocks
        }
      }
      // If no structured items found, create a single generic action
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
        } catch {
          // Skip if RLS blocks
        }
      }
      setActionItems((prev) => [...newItems, ...prev]);
    } finally {
      setIsSavingActions(false);
    }
  }, [extractActionItems]);

  // 自动推算进度
  const autoProgressMap = useCallback(() => {
    const map: Record<string, number> = {};
    for (const g of goals) {
      const auto = computeAutoProgress(g.id, tasks);
      if (auto >= 0) map[g.id] = auto;
    }
    return map;
  }, [goals, tasks]);

  // 开始复盘
  const startReview = useCallback((alert: DeviationAlert) => {
    setSelectedAlert(alert);
    const ctx = {
      targetTitle: alert.targetTitle,
      targetType: alert.targetType,
      progress: alert.progress,
      status: 'active',
      deviationPercent: alert.deviationPercent,
      tags: [alert.severity === 'danger' ? '严重偏差' : '轻度偏差', alert.isOverdue ? '逾期' : ''],
      daysRemaining: 0,
      isOverdue: alert.isOverdue,
    };
    const recs = recommendModels(ctx);
    if (recs.length > 0) {
      setSelectedModel(recs[0].model);
    } else {
      setSelectedModel(REVIEW_MODELS[0]);
    }
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
      // 所有步骤完成，生成草稿
      generateDraft();
    } else {
      setSession((prev) => prev ? { ...prev, currentStep: nextIdx } : null);
    }
  }, [session, selectedModel]);

  const prevStep = useCallback(() => {
    if (!session) return;
    setSession((prev) => prev ? { ...prev, currentStep: Math.max(0, prev.currentStep - 1) } : null);
  }, [session]);

  // AI一键生成复盘草稿
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
      // fallback: 用输入直接拼
      const fallback = selectedModel.steps
        .map((s) => `## ${s.title}\n${session.inputs[s.id] || '（未填写）'}`)
        .join('\n\n');
      setSession((prev) => prev ? { ...prev, draft: fallback, status: 'draft_ready' } : null);
      setPhase('draft');
    } finally {
      setIsGenerating(false);
    }
  }, [session, selectedModel, industry, dept]);

  const sevCls: Record<string, string> = {
    danger: 'border-danger/40 bg-danger/5',
    warn: 'border-warn/40 bg-warn/5',
    info: 'border-primary/40 bg-primary/5',
  };
  const sevIcon: Record<string, string> = { danger: 'text-danger', warn: 'text-warn', info: 'text-primary-2' };

  if (goalsLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  // --- Phase: Alerts ---
  if (phase === 'alerts') {
    const apm = autoProgressMap();
    return (
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <RotateCcw size={18} className="text-primary-2" />
          <span className="text-sm font-bold">MLOO 隐性复盘</span>
          <span className="ml-auto text-[10px] text-text-3">偏差自动检测 + AI复盘</span>
        </div>

        {/* Auto Progress Section */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Sparkles size={13} className="text-accent" />
            <span className="text-xs font-bold text-text-3 uppercase tracking-wider">自动进度推算</span>
          </div>
          <div className="space-y-1.5">
            {Object.entries(apm).map(([goalId, autoProg]) => {
              const g = goals.find((gl) => gl.id === goalId);
              if (!g) return null;
              const diff = autoProg - g.progress;
              return (
                <div key={goalId} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2">
                  <span className="text-xs text-text-2 flex-1 truncate">{g.title}</span>
                  <span className="text-[10px] text-text-3">手动 {g.progress}%</span>
                  <ArrowRight size={10} className="text-text-3" />
                  <span className={`text-[10px] font-bold ${diff > 5 ? 'text-success' : diff < -5 ? 'text-danger' : 'text-text'}`}>推算 {autoProg}%</span>
                  {Math.abs(diff) > 10 && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${diff > 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                      偏差{diff > 0 ? '+' : ''}{diff}%
                    </span>
                  )}
                </div>
              );
            })}
            {Object.keys(apm).length === 0 && (
              <div className="text-[10px] text-text-3 p-2">暂无目标同时关联任务，无法自动推算进度</div>
            )}
          </div>
        </div>

        {/* Deviation Alerts */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-text-3 uppercase tracking-wider">偏差预警</span>
            <button onClick={computeAlerts} className="text-[10px] text-primary-2 hover:underline">刷新</button>
          </div>
          {alerts.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle2 size={24} className="mx-auto text-success mb-2" />
              <div className="text-xs text-text-2">所有目标进度正常</div>
              <div className="text-[10px] text-text-3 mt-1">偏差{'>'}5%时会自动告警</div>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((a) => (
                <div key={a.id} onClick={() => { if (!rvRequire('customWorkflows', '深度复盘模式需要专业版或企业版')) return; startReview(a); }}
                  className={`rounded-xl border p-3 cursor-pointer transition-all hover:shadow-lg ${sevCls[a.severity]}`}>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <AlertTriangle size={13} className={sevIcon[a.severity]} />
                    <span className="text-xs font-semibold text-text flex-1">{a.targetTitle}</span>
                    {a.isOverdue && <span className="rounded-full bg-danger/20 px-1.5 py-0.5 text-[8px] font-bold text-danger">逾期</span>}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        // Mark matching persisted alert as read
                        const match = persistedAlerts.find((pa) => pa.goal_id === a.targetId && pa.alert_type === a.id);
                        if (match) {
                          try {
                            await updateDeviationAlert(match.id, { ...match, is_read: true });
                            setPersistedAlerts((prev) => prev.map((pa) => pa.id === match.id ? { ...pa, is_read: true } : pa));
                          } catch { /* ignore */ }
                        }
                      }}
                      className="text-text-3 hover:text-text p-0.5"
                      title="标为已读"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <div className="text-[10px] text-text-3 ml-5">{a.message}</div>
                  <div className="flex flex-wrap items-center gap-2 mt-2 ml-5">
                    <span className="text-[9px] text-text-3">推荐：</span>
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[9px] font-medium text-primary-2">
                      {REVIEW_MODELS.find((m) => m.id === a.recommendedModel)?.name}
                    </span>
                    <ChevronRight size={12} className="text-text-3 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Manual Review Entry */}
        <div className="border-t border-border pt-3">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <FileText size={13} className="text-text-3" />
            <span className="text-xs font-bold text-text-3 uppercase tracking-wider">手动发起复盘</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {REVIEW_MODELS.map((m) => (
              <button key={m.id} onClick={() => { if (!rvRequire('customWorkflows', '深度复盘模式需要专业版或企业版')) return; setSelectedAlert(null); setSelectedModel(m); setPhase('pick'); }}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-left transition-all hover:border-primary/50 hover:shadow-md">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base">{m.icon}</span>
                  <div>
                    <div className="text-[11px] font-semibold text-text">{m.name}</div>
                    <div className="text-[9px] text-text-3">{m.description.slice(0, 20)}...</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <PaywallModal open={rvShow} onClose={rvClose} reason={rvReason} feature={rvFeat} />
      </div>
    );
  }

  // --- Phase: Pick Model ---
  if (phase === 'pick') {
    const ctx = selectedAlert ? {
      targetTitle: selectedAlert.targetTitle,
      targetType: selectedAlert.targetType,
      progress: selectedAlert.progress,
      status: 'active',
      deviationPercent: selectedAlert.deviationPercent,
      tags: [],
      daysRemaining: 0,
      isOverdue: selectedAlert.isOverdue,
    } : null;
    const recs = ctx ? recommendModels(ctx) : REVIEW_MODELS.map((m) => ({ model: m, score: 50, reason: '' }));
    const target = selectedAlert?.targetTitle ?? '手动复盘';

    return (
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setPhase('alerts')} className="text-text-3 hover:text-text">&larr; 返回</button>
          <span className="text-sm font-bold">选择复盘框架</span>
        </div>
        <div className="text-xs text-text-2">复盘对象：<span className="font-semibold text-text">{target}</span></div>
        <div className="space-y-2">
          {recs.map((r) => (
            <button key={r.model.id} onClick={() => pickModel(r.model)}
              className="w-full rounded-xl border border-border bg-surface p-3 md:p-4 text-left transition-all hover:border-primary/50 hover:shadow-lg">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-2xl">{r.model.icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-bold text-text">{r.model.name}</div>
                  <div className="text-[10px] text-text-3">{r.model.description}</div>
                  {r.reason && <div className="mt-1 rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-medium text-primary-2 inline-block">AI推荐：{r.reason}</div>}
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-primary-2">{r.score}</div>
                  <div className="text-[8px] text-text-3">匹配度</div>
                </div>
                <ChevronRight size={16} className="text-text-3" />
              </div>
            </button>
          ))}
        </div>

        <PaywallModal open={rvShow} onClose={rvClose} reason={rvReason} feature={rvFeat} />
      </div>
    );
  }

  // --- Phase: Step-by-step Guide ---
  if (phase === 'guide' && session && selectedModel) {
    const step = selectedModel.steps[session.currentStep];
    const totalSteps = selectedModel.steps.length;
    const allFilled = selectedModel.steps.filter((s) => s.required).every((s) => session.inputs[s.id]?.trim());

    return (
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setPhase('pick')} className="text-text-3 hover:text-text">&larr; 返回</button>
          <span className="text-sm font-bold">{selectedModel.icon} {selectedModel.name}</span>
        </div>

        {/* Progress bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((session.currentStep + 1) / totalSteps) * 100}%` }} />
          </div>
          <span className="text-[10px] text-text-3">{session.currentStep + 1}/{totalSteps}</span>
        </div>

        {/* Target */}
        <div className="rounded-lg bg-surface-2 px-3 py-2 text-[10px] text-text-3">
          复盘对象：<span className="font-medium text-text">{session.targetTitle}</span>
        </div>

        {/* Current Step */}
        <div className="rounded-xl border border-border bg-surface p-3 md:p-4">
          <div className="text-sm font-bold text-text mb-2">{step.title}</div>
          <div className="text-xs text-text-2 mb-3">{step.prompt}</div>
          <textarea
            value={session.inputs[step.id] ?? ''}
            onChange={(e) => handleStepInput(step.id, e.target.value)}
            placeholder={step.placeholder}
            rows={4}
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-text outline-none placeholder:text-text-3 focus:border-primary/50 resize-none"
          />
        </div>

        {/* Step Navigator */}
        <div className="flex flex-wrap items-center gap-2">
          {session.currentStep > 0 && (
            <button onClick={prevStep} className={btnSecondary}>上一步</button>
          )}
          <div className="flex-1" />
          {session.currentStep < totalSteps - 1 ? (
            <button
              onClick={nextStep}
              disabled={step.required && !session.inputs[step.id]?.trim()}
              className={`${btnPrimary} disabled:opacity-40`}
            >
              下一步
            </button>
          ) : (
            <button
              onClick={generateDraft}
              disabled={isGenerating || !allFilled}
              className={`${btnPrimary} flex items-center gap-1.5 disabled:opacity-40`}
            >
              {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {isGenerating ? '生成中...' : 'AI 生成复盘报告'}
            </button>
          )}
        </div>

        {/* Quick-fill all steps */}
        <button
          onClick={() => { if (!rvRequire('customWorkflows', 'AI复盘生成需要专业版或企业版')) return; generateDraft(); }}
          disabled={isGenerating}
          className="w-full rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-2 text-[10px] text-primary-2 hover:bg-primary/10 transition-colors disabled:opacity-40"
        >
          {isGenerating ? 'AI正在分析...' : '跳过手动填写，AI一键生成复盘草稿 →'}
        </button>

        <PaywallModal open={rvShow} onClose={rvClose} reason={rvReason} feature={rvFeat} />
      </div>
    );
  }

  // --- Phase: Draft ---
  if (phase === 'draft' && session) {
    return (
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setPhase('guide')} className="text-text-3 hover:text-text">&larr; 返回编辑</button>
          <span className="text-sm font-bold">复盘报告</span>
          <span className="rounded-full bg-success/10 px-2 py-0.5 text-[9px] font-bold text-success">草稿已生成</span>
        </div>

        {/* Draft Content */}
        <div className="rounded-xl border border-border bg-surface p-3 md:p-4">
          <div className="prose prose-sm prose-invert max-w-none">
            {session.draft.split('\n').map((line, i) => {
              if (line.startsWith('# ')) return <h2 key={i} className="text-base font-bold text-text mt-3 mb-1">{line.slice(2)}</h2>;
              if (line.startsWith('## ')) return <h3 key={i} className="text-sm font-bold text-text mt-2 mb-1">{line.slice(3)}</h3>;
              if (line.startsWith('- [ ] ')) return <div key={i} className="flex flex-wrap items-center gap-2 text-xs text-primary-2"><Lightbulb size={11} />{line.slice(6)}</div>;
              if (line.startsWith('- ')) return <div key={i} className="text-xs text-text-2 ml-3">• {line.slice(2)}</div>;
              if (line.trim() === '') return <div key={i} className="h-2" />;
              return <div key={i} className="text-xs text-text-2 leading-relaxed">{line}</div>;
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              // Persist action items before completing
              if (session && session.draft) {
                saveActionItems(session.draft, session.targetId, session.id);
              }
              setPhase('done');
            }}
            className={btnPrimary}
            disabled={isSavingActions}
          >
            {isSavingActions ? <Loader2 size={12} className="animate-spin mr-1" /> : null}
            完成复盘并生成行动项
          </button>
          <button onClick={() => setPhase('guide')} className={btnSecondary}>继续编辑</button>
          <button onClick={() => generateDraft()} className={`${btnSecondary} flex items-center gap-1.5`}>
            <Sparkles size={12} /> 重新AI生成
          </button>
        </div>

        <PaywallModal open={rvShow} onClose={rvClose} reason={rvReason} feature={rvFeat} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <CheckCircle2 size={24} className="text-success" />
        <span className="text-sm font-bold text-success">复盘已完成</span>
      </div>
      <div className="rounded-xl border border-border bg-surface p-3 md:p-4">
        <div className="text-xs text-text-2 mb-2">复盘对象：<span className="font-semibold text-text">{selectedAlert?.targetTitle ?? session?.targetTitle ?? '手动复盘'}</span></div>
        <div className="text-xs text-text-2 mb-2">使用框架：<span className="font-semibold text-text">{selectedModel?.name ?? 'GRAI'}</span></div>
      </div>

      {/* Action Items from this review */}
      {actionItems.filter((ai) => ai.source_id === session?.id).length > 0 && (
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <ListChecks size={13} className="text-accent" />
            <span className="text-xs font-bold text-text-3 uppercase tracking-wider">生成的行动项</span>
          </div>
          <div className="space-y-1.5">
            {actionItems.filter((ai) => ai.source_id === session?.id).map((ai) => (
              <div key={ai.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
                <input
                  type="checkbox"
                  checked={ai.status === 'completed'}
                  onChange={async () => {
                    const newStatus = ai.status === 'completed' ? 'open' : 'completed';
                    try {
                      const updated = await updateActionItem(ai.id, {
                        status: newStatus,
                        completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
                        closed_loop: newStatus === 'completed' && !!ai.goal_id,
                      });
                      setActionItems((prev) => prev.map((p) => p.id === ai.id ? updated : p));
                    } catch { /* ignore */ }
                  }}
                  className="rounded border-border"
                />
                <span className={`text-xs flex-1 ${ai.status === 'completed' ? 'line-through text-text-3' : 'text-text'}`}>
                  {ai.title}
                </span>
                {ai.closed_loop && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-success/10 text-success font-bold">闭环</span>}
                {ai.goal_id && <span className="text-[8px] text-text-3">→ 目标</span>}
                {ai.status !== 'completed' && !ai.closed_loop && ai.goal_id && (
                  <button
                    className="flex flex-wrap items-center gap-0.5 rounded px-1.5 py-0.5 text-[8px] font-semibold text-primary-2 hover:bg-primary/10"
                    onClick={async () => {
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
                    }}
                  >
                    <Zap size={8} />转任务
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deviation alerts status */}
      {selectedAlert && persistedAlerts.some((pa) => pa.goal_id === selectedAlert.targetId && !pa.is_resolved) && (
        <div className="rounded-lg border border-warn/30 bg-warn/5 px-3 py-2">
          <div className="text-[10px] text-warn font-medium">偏差告警已记录</div>
          <div className="text-[9px] text-text-3 mt-0.5">完成行动项后，告警将自动关闭</div>
        </div>
      )}

      {/* Performance Score for reviewed goal */}
      {(() => {
        const goalId = selectedAlert?.targetId ?? session?.targetId;
        const goal = goals.find((g) => g.id === goalId);
        if (!goalId || !goal) return null;
        const goalTasks = tasks.filter((t) => t.goal_id === goalId);
        const goalActionItems = actionItems.filter((a) => a.goal_id === goalId);
        const score = computePerformanceScore({
          goalId, goalTitle: goal.title,
          targetProgress: 100,
          actualProgress: goal.progress,
          totalTasks: goalTasks.length,
          completedTasks: goalTasks.filter((t) => t.status === 'done' || t.status === 'completed').length,
          onTimeTasks: goalTasks.filter((t) => (t.status === 'done' || t.status === 'completed') && t.due_date && t.completed_at && t.completed_at <= t.due_date).length,
          totalActionItems: goalActionItems.length,
          closedActionItems: goalActionItems.filter((a) => a.closed_loop).length,
        });
        const GRADE_COLOR: Record<string, string> = { S: 'text-success', A: 'text-primary-2', B: 'text-warn', C: 'text-orange-400', D: 'text-danger' };
        return (
          <div className="rounded-xl border border-border bg-surface p-3 md:p-4">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Lightbulb size={14} className="text-accent" />
              <span className="text-xs font-bold">绩效评分</span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className={cn('text-3xl font-extrabold', GRADE_COLOR[score.grade])}>{score.grade}</div>
              <div className="flex-1 grid grid-cols-2 gap-2 text-[10px]">
                <div><span className="text-text-3">达成率</span> <span className="font-semibold text-text">{score.achievementRate}%</span></div>
                <div><span className="text-text-3">任务完成</span> <span className="font-semibold text-text">{score.taskCompletionRate}%</span></div>
                <div><span className="text-text-3">按时率</span> <span className="font-semibold text-text">{score.onTimeRate}%</span></div>
                <div><span className="text-text-3">闭环率</span> <span className="font-semibold text-text">{score.actionItemCloseRate}%</span></div>
              </div>
              <div className="text-right">
                <div className="text-lg font-extrabold text-text">{score.overall}</div>
                <div className="text-[9px] text-text-3">综合分</div>
              </div>
            </div>
          </div>
        );
      })()}

      <button onClick={() => { setPhase('alerts'); setSession(null); setSelectedAlert(null); }} className={btnPrimary}>返回复盘中心</button>

      <PaywallModal open={rvShow} onClose={rvClose} reason={rvReason} feature={rvFeat} />
    </div>
  );
}
