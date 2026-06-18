import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import { useMatrixCell, useIndustryColor, useGoals, useTasks, useActionItems } from '@/hooks/useMatrix';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, Target, CheckCircle2, ArrowRight, Zap, Clock, AlertTriangle } from 'lucide-react';
import { generateFocusPlan, FOCUS_TAG_CONFIG, type Prioritizable, type PrioritizedItem } from '@/lib/priorityEngine';
import LoopDiagram from '@/components/LoopDiagram';
import { t } from '@/lib/i18n';
import { CardSkeleton, TableRowSkeleton } from '@/components/Skeleton';

const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus };

export default function OverviewContent() {
  const navigateTo = useAppStore((s) => s.navigateTo);
  const navigate = useNavigate();
  const indColor = useIndustryColor();
  const { cell, loading } = useMatrixCell();
  const { goals, loading: goalsLoading } = useGoals();
  const { tasks, loading: tasksLoading } = useTasks();
  const { actionItems, loading: aiLoading } = useActionItems();

  const todayFocus = useMemo(() => {
    if (goalsLoading || tasksLoading || aiLoading) return { focusPlan: [] as PrioritizedItem[], overdueCount: 0, todayCount: 0, atRiskCount: 0 };

    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    const overdueCount = tasks.filter((t) =>
      t.status !== 'done' && t.status !== 'completed' && t.due_date && t.due_date.slice(0, 10) < today
    ).length;

    const todayCount = tasks.filter((t) =>
      t.status !== 'done' && t.status !== 'completed' && t.due_date && t.due_date.slice(0, 10) === today
    ).length;

    const atRiskCount = goals.filter((g) => {
      if (!g.start_date || !g.end_date || g.progress >= 100) return false;
      const start = new Date(g.start_date).getTime();
      const end = new Date(g.end_date).getTime();
      const elapsed = (now.getTime() - start) / (end - start);
      const expected = Math.min(1, Math.max(0, elapsed)) * 100;
      return g.progress < expected - 15;
    }).length;

    const allItems: Prioritizable[] = [
      ...tasks.map((t) => ({
        id: t.id, title: t.title, type: 'task' as const,
        status: t.status, priority: t.priority, due_date: t.due_date,
        goal_id: t.goal_id, done: t.done,
      })),
      ...goals.map((g) => ({
        id: g.id, title: g.title, type: 'goal' as const,
        status: g.status, priority: g.priority, progress: g.progress,
        due_date: g.end_date, start_date: g.start_date,
      })),
      ...actionItems.map((a) => ({
        id: a.id, title: a.title, type: 'action_item' as const,
        status: a.status, priority: a.priority, due_date: a.due_date,
        goal_id: a.goal_id, closed_loop: a.closed_loop, source: a.source,
      })),
    ];

    const focusPlan = generateFocusPlan(allItems);

    return { focusPlan, overdueCount, todayCount, atRiskCount };
  }, [goals, tasks, actionItems, goalsLoading, tasksLoading, aiLoading]);

  const realKpis = useMemo(() => {
    if (goalsLoading || tasksLoading || aiLoading) return [];
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    const activeGoals = goals.filter((g) => g.status !== 'cancelled');
    const completedGoals = goals.filter((g) => g.status === 'completed');
    const completedTasks = tasks.filter((t) => t.status === 'done' || t.status === 'completed');

    const goalCompletionRate = activeGoals.length > 0 ? Math.round(completedGoals.length / goals.length * 100) : 0;
    const taskCompletionRate = tasks.length > 0 ? Math.round(completedTasks.length / tasks.length * 100) : 0;
    const overdueTasks = tasks.filter((t) =>
      (t.status !== 'done' && t.status !== 'completed' && t.due_date && t.due_date.slice(0, 10) < today)
    ).length;
    const atRiskGoals = goals.filter((g) => {
      if (!g.start_date || !g.end_date || g.progress >= 100) return false;
      const start = new Date(g.start_date).getTime();
      const end = new Date(g.end_date).getTime();
      const elapsed = (now.getTime() - start) / (end - start);
      const expected = Math.min(1, Math.max(0, elapsed)) * 100;
      return g.progress < expected - 15;
    }).length;

    const todayTasks = tasks.filter((t) =>
      (t.status !== 'done' && t.status !== 'completed' && t.due_date && t.due_date.slice(0, 10) === today)
    ).length;

    const openAI = actionItems.filter((a) => a.status === 'open' || a.status === 'in_progress');

    return [
      { name: t('overview.goalCompletionRate'), value: `${goalCompletionRate}%`, target: '100%', status: goalCompletionRate >= 70 ? 'good' : goalCompletionRate >= 40 ? 'warn' : 'bad', trend: goalCompletionRate >= 50 ? 'up' as const : 'down' as const },
      { name: t('overview.taskCompletionRate'), value: `${taskCompletionRate}%`, target: '90%', status: taskCompletionRate >= 70 ? 'good' : taskCompletionRate >= 40 ? 'warn' : 'bad', trend: taskCompletionRate >= 50 ? 'up' as const : 'flat' as const },
      { name: t('overview.overdueTasks'), value: `${overdueTasks}`, target: '0', status: overdueTasks === 0 ? 'good' : overdueTasks <= 3 ? 'warn' : 'bad', trend: overdueTasks === 0 ? 'up' as const : overdueTasks <= 3 ? 'flat' as const : 'down' as const },
      { name: t('overview.atRiskGoals'), value: `${atRiskGoals}`, target: '0', status: atRiskGoals === 0 ? 'good' : atRiskGoals <= 2 ? 'warn' : 'bad', trend: atRiskGoals === 0 ? 'up' as const : 'down' as const },
      { name: t('overview.todayTodo'), value: `${todayTasks}`, target: '-', status: todayTasks <= 5 ? 'good' : todayTasks <= 10 ? 'warn' : 'bad', trend: 'flat' as const },
      { name: t('overview.pendingActions'), value: `${openAI.length}`, target: '0', status: openAI.length === 0 ? 'good' : openAI.length <= 5 ? 'warn' : 'bad', trend: openAI.length === 0 ? 'up' as const : 'flat' as const },
    ];
  }, [goals, tasks, actionItems, goalsLoading, tasksLoading, aiLoading]);

  if (goalsLoading || tasksLoading || aiLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
        <CardSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
      <div className="rounded-xl border border-border p-3 md:p-4 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${indColor}08 0%, ${indColor}03 100%)` }}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10" style={{ backgroundColor: indColor }} />
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-lg">☀️</span>
            <span className="text-sm font-bold">{t('overview.morningFocus')}</span>
            <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ backgroundColor: indColor + '20', color: indColor }}>{t('overview.morningReport')}</span>
          </div>
          <p className="text-sm leading-relaxed text-text-2">{cell.morning}</p>
        </div>
      </div>

      {todayFocus.focusPlan.length > 0 && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 md:p-4">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Zap size={16} className="text-accent" />
            <span className="text-sm font-bold text-accent">{t('overview.aiSmartFocus')}</span>
            <span className="hidden sm:inline text-[10px] text-text-3">{t('overview.focusScoring')}</span>
            {todayFocus.overdueCount > 0 && <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[9px] font-bold text-danger">{t('overview.overdueCount', { count: todayFocus.overdueCount })}</span>}
            {todayFocus.atRiskCount > 0 && <span className="rounded-full bg-warn/10 px-2 py-0.5 text-[9px] font-bold text-warn">{t('overview.deviation', { count: todayFocus.atRiskCount })}</span>}
          </div>

          <div className="space-y-1.5 max-h-72 md:max-h-none overflow-y-auto">
            {todayFocus.focusPlan.map((item, idx) => {
              const tagConfig = FOCUS_TAG_CONFIG[item.focusTag];
              const targetModule = item.type === 'goal' ? 'goals' : item.type === 'task' ? 'tasks' : 'actionItems';
              const TypeIcon = item.type === 'goal' ? Target : item.type === 'task' ? CheckCircle2 : Zap;
              return (
                <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-2.5 md:px-3 py-2 md:py-2.5 transition-all hover:shadow-md">
                  <span className="text-xs shrink-0">{tagConfig.icon}</span>
                  <div className="flex h-5 w-5 items-center justify-center rounded shrink-0" style={{ backgroundColor: indColor + '15' }}>
                    <TypeIcon size={10} style={{ color: indColor }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-text truncate">{item.title}</span>
                      <span className={cn('rounded-full px-1.5 py-px text-[8px] font-bold', tagConfig.color)} style={{ backgroundColor: 'var(--focus-tag-bg)' }}>
                        {tagConfig.label}
                      </span>
                    </div>
                    <span className="hidden sm:inline text-[9px] text-text-3">{item.reason}</span>
                  </div>
                  {item.due_date && (
                    <span className={cn('text-[9px] shrink-0 flex items-center gap-0.5', item.priorityScore >= 50 ? 'text-danger' : 'text-text-3')}>
                      <Clock size={8} />{item.due_date.slice(5, 10)}
                    </span>
                  )}
                  <button
                    className="shrink-0 rounded-lg bg-primary/10 px-2 py-1 text-[9px] font-semibold text-primary-2 hover:bg-primary/20"
                    onClick={() => navigate(navigateTo('workspace', targetModule))}
                  >
                    {t('overview.goHandle')}
                   </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 text-xs font-bold text-text-3 uppercase tracking-wider">{t('overview.coreMetrics')}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {realKpis.map((kpi) => {
            const TrendIcon = TREND_ICON[kpi.trend];
            const pct = kpi.status === 'good' ? 90 : kpi.status === 'warn' ? 60 : 30;
            return (
              <div key={kpi.name} className="rounded-xl border border-border bg-surface p-3 transition-all hover:border-border-2 hover:shadow-lg hover:-translate-y-0.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-text-3">{kpi.name}</span>
                  <TrendIcon size={13} className={kpi.status === 'good' ? 'text-success' : kpi.status === 'warn' ? 'text-warn' : 'text-danger'} />
                </div>
                <div className={cn('text-xl font-extrabold', kpi.status === 'good' ? 'text-success' : kpi.status === 'warn' ? 'text-warn' : 'text-danger')}>
                  {kpi.value}
                </div>
                <div className="mt-1 text-[10px] text-text-3">{t('overview.target', { value: kpi.target })}</div>
                <div className="mt-2 h-1 rounded-full bg-surface-2 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${pct}%`,
                    backgroundColor: kpi.status === 'good' ? 'var(--color-success)' : kpi.status === 'warn' ? 'var(--color-warn)' : 'var(--color-danger)',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <LoopDiagram
        goals={goals.filter((g) => g.status !== 'cancelled').length}
        tasks={tasks.filter((t) => t.status !== 'cancelled' && !t.done).length}
        actionItems={actionItems.filter((a) => a.status === 'open' || a.status === 'in_progress').length}
        reviews={0}
        completionRate={goals.length > 0 ? Math.round(goals.filter((g) => g.status === 'completed').length / goals.length * 100) : 0}
      />

      {/* Project progress & risk overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Project Progress Card */}
        <div className="rounded-xl border border-border bg-surface p-3 md:p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-text-3 uppercase tracking-wider">{t('overview.projectProgress')}</span>
            <button onClick={() => navigate(navigateTo('workspace', 'projects'))} className="text-[10px] text-primary-2 hover:underline">{t('overview.viewAll')}</button>
          </div>
          {goals.filter((g) => g.status === 'in_progress' || g.status === 'active').slice(0, 4).map((g) => {
            const pct = Math.min(100, Math.max(0, g.progress || 0));
            const barColor = pct >= 70 ? 'bg-success' : pct >= 40 ? 'bg-warn' : 'bg-danger';
            return (
              <div key={g.id} className="mb-2.5 last:mb-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-text truncate max-w-[70%]">{g.title}</span>
                  <span className={cn('text-[10px] font-bold', pct >= 70 ? 'text-success' : pct >= 40 ? 'text-warn' : 'text-danger')}>{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                  <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          {goals.filter((g) => g.status === 'in_progress' || g.status === 'active').length === 0 && (
            <div className="text-center py-4 text-xs text-text-3">{t('overview.noActiveGoals')}</div>
          )}
        </div>

        {/* Risk items + Weekly report entry */}
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-surface p-3 md:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-text-3 uppercase tracking-wider">{t('overview.riskAlert')}</span>
              <button onClick={() => navigate(navigateTo('ai', 'risk'))} className="text-[10px] text-primary-2 hover:underline">{t('overview.aiAnalysis')}</button>
            </div>
            {todayFocus.overdueCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-danger/5 border border-danger/20 px-2.5 py-2 mb-1.5">
                <AlertTriangle size={12} className="text-danger shrink-0" />
                <span className="text-xs text-danger font-medium">{t('overview.overdueTasksNeedAction', { count: todayFocus.overdueCount })}</span>
              </div>
            )}
            {todayFocus.atRiskCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-warn/5 border border-warn/20 px-2.5 py-2 mb-1.5">
                <TrendingDown size={12} className="text-warn shrink-0" />
                <span className="text-xs text-warn font-medium">{t('overview.goalsBehind', { count: todayFocus.atRiskCount })}</span>
              </div>
            )}
            {todayFocus.overdueCount === 0 && todayFocus.atRiskCount === 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-success/5 border border-success/20 px-2.5 py-2">
                <CheckCircle2 size={12} className="text-success shrink-0" />
                <span className="text-xs text-success font-medium">{t('overview.noRisks')}</span>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate(navigateTo('ai', 'risk'))}
            className="w-full group flex items-center justify-between rounded-xl border border-border bg-surface p-3 md:p-4 transition-all hover:border-primary/30 hover:shadow-lg"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <div>
                <div className="text-xs font-semibold text-text">{t('overview.aiRiskAlert')}</div>
                <div className="text-[10px] text-text-3 mt-0.5">{t('overview.aiRiskDesc')}</div>
              </div>
            </div>
            <ArrowRight size={16} className="text-text-3 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button onClick={() => navigate(navigateTo('collab'))} className="group flex items-center justify-between rounded-xl border border-border bg-surface p-3 md:p-4 transition-all hover:border-primary/30 hover:shadow-lg">
          <div><div className="text-xs font-semibold text-text">{t('overview.collabDesk')}</div><div className="text-[10px] text-text-3 mt-0.5">{t('overview.activeChannels', { count: cell.channels.length })}</div></div>
          <ArrowRight size={16} className="text-text-3 transition-transform group-hover:translate-x-1 group-hover:text-primary-2" />
        </button>
        <button onClick={() => navigate(navigateTo('ai'))} className="group flex items-center justify-between rounded-xl border border-border bg-surface p-3 md:p-4 transition-all hover:border-primary/30 hover:shadow-lg">
          <div><div className="text-xs font-semibold text-text">{t('overview.aiDesk')}</div><div className="text-[10px] text-text-3 mt-0.5">{t('overview.aiColleagues', { count: cell.agents.length })}</div></div>
          <ArrowRight size={16} className="text-text-3 transition-transform group-hover:translate-x-1 group-hover:text-primary-2" />
        </button>
      </div>
    </div>
  );
}
