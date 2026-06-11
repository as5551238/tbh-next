import { CheckCircle2, ListChecks, Zap, Lightbulb, TrendingUp, AlertTriangle } from 'lucide-react';
import { btnPrimary } from '@/components/Modal';
import { computePerformanceScore, getReviewSnapshot, computeReviewEffectiveness, type DeviationAlert, type ReviewSession } from '@/lib/reviewEngine';
import type { DeviationAlertRow } from '@/lib/dataLayer/types';
import type { ActionItemRow } from '@/lib/dataLayer';
import { cn } from '@/lib/utils';

interface DonePhaseProps {
  session: ReviewSession | null;
  selectedAlert: DeviationAlert | null;
  selectedModelId: string | null;
  actionItems: ActionItemRow[];
  persistedAlerts: DeviationAlertRow[];
  goals: { id: string; title: string; progress: number; end_date?: string }[];
  tasks: { goal_id?: string; status: string; priority?: string; due_date?: string; completed_at?: string; done?: boolean }[];
  onToggleActionItem: (ai: ActionItemRow) => void;
  onConvertToTask: (ai: ActionItemRow) => void;
  onReset: () => void;
  paywallSlot: React.ReactNode;
}

export function ReviewDonePhase({
  session, selectedAlert, selectedModelId, actionItems, persistedAlerts, goals, tasks,
  onToggleActionItem, onConvertToTask, onReset, paywallSlot,
}: DonePhaseProps) {
  const REVIEW_MODEL_NAMES: Record<string, string> = Object.fromEntries(
    // Lazy but works — import REVIEW_MODELS here would cause circular; parent can pass names if needed
    [] as [string, string][]
  );

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <CheckCircle2 size={24} className="text-success" />
        <span className="text-sm font-bold text-success">复盘已完成</span>
      </div>
      <div className="rounded-xl border border-border bg-surface p-3 md:p-4">
        <div className="text-xs text-text-2 mb-2">复盘对象：<span className="font-semibold text-text">{selectedAlert?.targetTitle ?? session?.targetTitle ?? '手动复盘'}</span></div>
        <div className="text-xs text-text-2 mb-2">使用框架：<span className="font-semibold text-text">{selectedModelId ?? 'GRAI'}</span></div>
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
                  onChange={() => onToggleActionItem(ai)}
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
                    onClick={() => onConvertToTask(ai)}
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

      {/* Performance Score */}
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

      {/* Review Effectiveness Tracking */}
      {session && (() => {
        const goalId = session.targetId;
        const goal = goals.find((g) => g.id === goalId);
        if (!goalId || !goal) return null;
        const progressBefore = getReviewSnapshot(session.id, goalId);
        if (progressBefore === null) return null;
        const reviewActionItems = actionItems.filter((a) => a.source_id === session.id);
        const effectiveness = computeReviewEffectiveness({
          reviewId: session.id,
          goalProgressBefore: progressBefore,
          goalProgressNow: goal.progress,
          totalActionItems: reviewActionItems.length,
          completedActionItems: reviewActionItems.filter((a) => a.status === 'completed').length,
          closedActionItems: reviewActionItems.filter((a) => a.closed_loop).length,
          reviewCompletedAt: session.updatedAt,
        });
        const EFF_GRADE: Record<string, { label: string; color: string; bg: string }> = {
          excellent: { label: '优秀', color: 'text-success', bg: 'bg-success/10' },
          good: { label: '良好', color: 'text-primary-2', bg: 'bg-primary/10' },
          moderate: { label: '一般', color: 'text-warn', bg: 'bg-warn/10' },
          poor: { label: '待改进', color: 'text-danger', bg: 'bg-danger/10' },
        };
        const eg = EFF_GRADE[effectiveness.effectivenessGrade];
        return (
          <div className="rounded-xl border border-border bg-surface p-3 md:p-4">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-accent" />
              <span className="text-xs font-bold">复盘有效性追踪</span>
              <span className={cn('ml-auto rounded-full px-2 py-0.5 text-[9px] font-bold', eg.bg, eg.color)}>{eg.label}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center mb-3">
              <div className="rounded-lg bg-surface-2 p-2">
                <div className="text-sm font-bold text-text">{effectiveness.effectivenessScore}</div>
                <div className="text-[8px] text-text-3">有效性评分</div>
              </div>
              <div className="rounded-lg bg-surface-2 p-2">
                <div className={cn('text-sm font-bold', effectiveness.progressDelta >= 0 ? 'text-success' : 'text-danger')}>
                  {effectiveness.progressDelta >= 0 ? '+' : ''}{effectiveness.progressDelta}%
                </div>
                <div className="text-[8px] text-text-3">目标进度变化</div>
              </div>
              <div className="rounded-lg bg-surface-2 p-2">
                <div className="text-sm font-bold text-text">{effectiveness.actionCompletionRate}%</div>
                <div className="text-[8px] text-text-3">行动项完成率</div>
              </div>
              <div className="rounded-lg bg-surface-2 p-2">
                <div className="text-sm font-bold text-text">{effectiveness.closeRate}%</div>
                <div className="text-[8px] text-text-3">闭环率</div>
              </div>
            </div>
            <div className="text-[9px] text-text-3">
              复盘时进度 {effectiveness.goalProgressBefore}% → 当前 {effectiveness.goalProgressNow}%
              （{effectiveness.daysSinceReview} 天前复盘）
            </div>
          </div>
        );
      })()}

      <button onClick={onReset} className={btnPrimary}>返回复盘中心</button>
      {paywallSlot}
    </div>
  );
}
