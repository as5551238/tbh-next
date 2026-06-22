import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import { useTasks, useGoals, useActionItems } from '@/hooks/useMatrix';
import { generateFocusPlan, FOCUS_TAG_CONFIG, type Prioritizable, type PrioritizedItem } from '@/lib/priorityEngine';
import { t } from '@/lib/i18n';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface QuickTask {
  id: string;
  title: string;
  priority: string;
  status: string;
  due_date: string;
}

interface GoalSummary {
  id: string;
  title: string;
  progress: number;
  status: string;
}

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-danger-bright/20 text-danger-bright',
  medium: 'bg-manuf/20 text-manuf',
  low: 'bg-accent/20 text-accent',
};

const PRIORITY_LABELS: Record<string, string> = {
  high: t('tasks.priorityUrgent'),
  medium: t('tasks.priorityMedium'),
  low: t('tasks.priorityLow'),
};

const STATUS_STYLES: Record<string, string> = {
  on_track: 'text-accent',
  at_risk: 'text-manuf',
  ahead: 'text-brand-accent',
  off_track: 'text-danger-bright',
};

const STATUS_LABELS: Record<string, string> = {
  on_track: t('overview.normal'),
  at_risk: t('overview.risk'),
  ahead: t('overview.normal'),
  off_track: t('overview.risk'),
};

/* ------------------------------------------------------------------ */
/*  Current time greeting                                              */
/* ------------------------------------------------------------------ */
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return t('myToday.greetingLateNight');
  if (h < 9) return t('myToday.greetingMorning');
  if (h < 12) return t('myToday.greetingForenoon');
  if (h < 14) return t('myToday.greetingNoon');
  if (h < 18) return t('myToday.greetingAfternoon');
  return t('myToday.greetingEvening');
}

function getProgressColor(progress: number): string {
  if (progress >= 80) return 'var(--status-success)';
  if (progress >= 50) return 'var(--status-warning)';
  return 'var(--status-danger-bright)';
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function MyToday() {
  const navigate = useNavigate();
  const navigateTo = useAppStore((s) => s.navigateTo);
  const { tasks: dbTasks } = useTasks();
  const { goals: dbGoals } = useGoals();
  const { actionItems } = useActionItems();

  const [now, setNow] = useState(new Date());

  const tasks: QuickTask[] = useMemo(() => dbTasks.map((item) => ({
    id: item.id, title: item.title, priority: item.priority ?? 'medium', status: item.status, due_date: item.due_date ?? '',
  })), [dbTasks]);

  const goals: GoalSummary[] = useMemo(() => dbGoals.map((g) => ({
    id: g.id, title: g.title, progress: g.progress ?? 0, status: g.status,
  })), [dbGoals]);

  const hasData = tasks.length > 0 || goals.length > 0;

  const focusPlan: PrioritizedItem[] = useMemo(() => {
    const items: Prioritizable[] = [
      ...(goals || []).map((g) => ({
        id: g.id, title: g.title, type: 'goal' as const,
        status: g.status, progress: g.progress,
        due_date: null, start_date: null,
        goal_id: null, done: false, closed_loop: false,
      })),
      ...(dbTasks || []).map((t) => ({
        id: t.id, title: t.title, type: 'task' as const,
        status: t.status, priority: t.priority,
        due_date: t.due_date, goal_id: t.goal_id,
        done: t.done ?? t.status === 'done', closed_loop: false,
      })),
      ...(actionItems || []).map((a) => ({
        id: a.id, title: a.title, type: 'action_item' as const,
        status: a.status, priority: a.priority,
        due_date: a.due_date, goal_id: a.goal_id,
        done: a.status === 'completed', closed_loop: a.closed_loop,
        source: a.source, owner_id: null, assignee_id: a.assignee_id,
      })),
    ];
    return generateFocusPlan(items).slice(0, 5);
  }, [goals, dbTasks, actionItems]);

  const insights = useMemo(() => {
    const items: string[] = [];
    const atRiskGoals = goals.filter((g) => g.status === 'at_risk' || g.status === 'off_track');
    if (atRiskGoals.length > 0) items.push(t('myToday.insightGoalBehind', { title: atRiskGoals[0].title }));
    const pendingHigh = tasks.filter((item) => item.priority === 'high' && item.status !== 'done');
    if (pendingHigh.length > 0) items.push(t('myToday.insightPendingUrgent', { count: pendingHigh.length }));
    const doneRate = tasks.length > 0 ? Math.round((tasks.filter((item) => item.status === 'done').length / tasks.length) * 100) : 0;
    if (tasks.length > 0) items.push(t('myToday.insightCompletionRate', { rate: doneRate }));
    return items;
  }, [tasks, goals]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const pendingTasks = tasks.filter((item) => item.status !== 'done');
  const completedTasks = tasks.filter((item) => item.status === 'done');
  const completionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  function goToModule(iface: string, mod: string) {
    navigate(navigateTo(iface, mod));
  }

  function getItemTypeLabel(type: string) {
    if (type === 'goal') return t('myToday.goalItem');
    if (type === 'task') return t('myToday.taskItem');
    return t('myToday.actionItem');
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">
            {getGreeting()}
          </h1>
          <p className="text-text-muted mt-1">
            {now.toLocaleDateString(t('myToday.dateLocale'), {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
            &nbsp;&middot;&nbsp;
            {now.toLocaleTimeString(t('myToday.dateLocale'), { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-brand-accent">{pendingTasks.length}</div>
          <div className="text-xs text-text-muted">{t('myToday.pendingTasks')}</div>
        </div>
      </div>

      {/* Quick stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => goToModule('workspace', 'tasks')}
          className="bg-surface border border-border-2 rounded-xl p-3 md:p-4 text-left hover:border-brand-accent transition-colors"
        >
          <div className="text-2xl font-bold text-brand-accent">{pendingTasks.length}</div>
          <div className="text-xs text-text-muted mt-1">{t('myToday.todayPending')}</div>
        </button>

        <button
          onClick={() => goToModule('workspace', 'goals')}
          className="bg-surface border border-border-2 rounded-xl p-3 md:p-4 text-left hover:border-accent transition-colors"
        >
          <div className="text-2xl font-bold text-accent">{completionRate}%</div>
          <div className="text-xs text-text-muted mt-1">{t('myToday.completionRate')}</div>
        </button>

        <button
          onClick={() => goToModule('workspace', 'goals')}
          className="bg-surface border border-border-2 rounded-xl p-3 md:p-4 text-left hover:border-manuf transition-colors"
        >
          <div className="text-2xl font-bold text-manuf">
            {goals.filter((g) => g.status === 'at_risk' || g.status === 'off_track').length}
          </div>
          <div className="text-xs text-text-muted mt-1">{t('myToday.riskGoals')}</div>
        </button>

        <button
          onClick={() => goToModule('ai', 'main')}
          className="bg-surface border border-border-2 rounded-xl p-3 md:p-4 text-left hover:border-brand-accent transition-colors"
        >
          <div className="text-2xl font-bold">🧠</div>
          <div className="text-xs text-text-muted mt-1">{t('myToday.aiAssistant')}</div>
        </button>
      </div>

      {/* Priority Focus Section */}
      {focusPlan.length > 0 && (
        <div className="rounded-xl border border-border-2 bg-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg">🎯</span>
              <h2 className="text-lg font-semibold text-text">{t('myToday.todayFocus')}</h2>
              <span className="rounded-full px-2 py-0.5 text-[9px] font-bold bg-brand-accent/10 text-brand-accent">{t('myToday.aiSorted')}</span>
            </div>
            <button
              onClick={() => goToModule('workspace', 'overview')}
              className="text-sm text-brand-accent hover:underline"
            >
              {t('myToday.viewAll')}
            </button>
          </div>
          <div className="space-y-2">
            {focusPlan.map((item, i) => {
              const cfg = FOCUS_TAG_CONFIG[item.focusTag];
              const isOverdue = item.due_date && new Date(item.due_date) < new Date();
              const isAtRisk = item.focusTag === 'urgent' || item.focusTag === 'important';
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                    isOverdue ? 'bg-danger-bright/5 border-danger-bright/20' :
                    isAtRisk ? 'bg-manuf/5 border-manuf/20' :
                    'bg-surface-deep border-border-2'
                  }`}
                >
                  <span className="text-xs font-bold text-text-muted w-4">{i + 1}</span>
                  <span className="text-sm">{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-text truncate">{item.title}</div>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-text-muted">
                      <span>{getItemTypeLabel(item.type)}</span>
                      <span>·</span>
                      <span>{item.reason}</span>
                      {isOverdue && <span className="text-danger-bright font-bold">{t('myToday.overdue')}</span>}
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    item.focusTag === 'urgent' ? 'bg-danger-bright/10 text-danger-bright' :
                    item.focusTag === 'important' ? 'bg-brand-accent/10 text-brand-accent' :
                    item.focusTag === 'momentum' ? 'bg-accent/10 text-accent' :
                    item.focusTag === 'low-hanging' ? 'bg-manuf/10 text-manuf' :
                    'bg-white/5 text-text-muted'
                  }`}>{cfg.label}</span>
                  {isOverdue && <span className="text-[10px] px-1.5 py-0.5 rounded bg-danger-bright/10 text-danger-bright font-bold shrink-0">{t('myToday.overdue')}</span>}
                  {isAtRisk && !isOverdue && <span className="text-[10px] px-1.5 py-0.5 rounded bg-manuf/10 text-manuf font-bold shrink-0">{t('myToday.risk')}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main content grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Tasks section */}
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text">{t('myToday.todayTasks')}</h2>
            <button
              onClick={() => goToModule('workspace', 'tasks')}
              className="text-sm text-brand-accent hover:underline"
            >
              {t('myToday.viewAllTasks')}
            </button>
          </div>

          {pendingTasks.length === 0 && completedTasks.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-border-2 border-dashed bg-surface-deep">
              <div className="text-4xl mb-3">📋</div>
              <div className="text-sm text-text-muted mb-4">{t('myToday.noTasks')}</div>
              <button
                onClick={() => goToModule('workspace', 'tasks')}
                className="rounded-lg bg-brand-accent px-4 py-2 text-xs font-semibold text-white hover:bg-brand-accent/80 transition-colors"
              >
                {t('myToday.createFirstTask')}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => goToModule('workspace', 'tasks')}
                className="w-full flex flex-wrap items-center gap-3 bg-surface border border-border-2 rounded-lg p-3 text-left hover:border-brand-accent/50 transition-colors"
              >
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    task.priority === 'high'
                      ? 'bg-danger-bright'
                      : task.priority === 'medium'
                      ? 'bg-manuf'
                      : 'bg-accent'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text truncate">{task.title}</div>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_STYLES[task.priority]}`}
                >
                  {PRIORITY_LABELS[task.priority]}
                </span>
                {task.due_date && (
                  <span className="text-xs text-text-muted shrink-0">{task.due_date}</span>
                )}
              </button>
            ))}

            {completedTasks.map((task) => (
              <div
                key={task.id}
                className="flex flex-wrap items-center gap-3 bg-surface-deep rounded-lg p-3 opacity-60"
              >
                <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
                <span className="text-sm text-text-muted line-through flex-1 truncate">
                  {task.title}
                </span>
                <span className="text-xs text-accent">✓</span>
              </div>
            ))}
            </div>
          )}
        </div>

        {/* Sidebar: Goals + AI Insights */}
        <div className="space-y-6">
          {/* Goals */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-text">{t('myToday.goalProgress')}</h2>
              <button
                onClick={() => goToModule('workspace', 'goals')}
                className="text-sm text-brand-accent hover:underline"
              >
                {t('myToday.viewAll')}
              </button>
            </div>

            <div className="space-y-3">
              {goals.length === 0 ? (
                <div className="text-center py-8 rounded-xl border border-border-2 border-dashed bg-surface-deep">
                  <div className="text-3xl mb-2">🎯</div>
                  <div className="text-xs text-text-muted mb-3">{t('myToday.setFirstGoal')}</div>
                  <button
                    onClick={() => goToModule('workspace', 'goals')}
                    className="rounded-lg bg-accent px-3 py-1.5 text-[10px] font-semibold text-surface-deep hover:bg-accent/80 transition-colors"
                  >
                    {t('myToday.createGoal')}
                  </button>
                </div>
              ) : goals.map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => goToModule('workspace', 'goals')}
                  className="w-full bg-surface border border-border-2 rounded-lg p-3 text-left hover:border-brand-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-text truncate flex-1">{goal.title}</span>
                    <span className={`text-xs ml-2 ${STATUS_STYLES[goal.status]}`}>
                      {STATUS_LABELS[goal.status]}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--progress-track)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${goal.progress}%`,
                          backgroundColor: getProgressColor(goal.progress),
                        }}
                      />
                    </div>
                    <span className="text-xs text-text-muted w-8 text-right">{goal.progress}%</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-text">{t('myToday.todayInsights')}</h2>
              <button
                onClick={() => goToModule('ai', 'morning')}
                className="text-sm text-brand-accent hover:underline"
              >
                {t('myToday.morningBrief')}
              </button>
            </div>

            <div className="space-y-2">
              {insights.length === 0 ? (
                <div className="bg-surface border border-border-2 rounded-lg p-3">
                  <div className="flex flex-wrap items-start gap-2">
                    <span className="text-brand-accent text-sm mt-0.5">💡</span>
                    <p className="text-sm text-text-muted leading-relaxed">{t('myToday.noInsights')}</p>
                  </div>
                </div>
              ) : insights.map((insight, i) => (
                <div
                  key={i}
                  className="bg-surface border border-border-2 rounded-lg p-3"
                >
                  <div className="flex flex-wrap items-start gap-2">
                    <span className="text-brand-accent text-sm mt-0.5">💡</span>
                    <p className="text-sm text-text-muted leading-relaxed">{insight}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
