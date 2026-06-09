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
  high: 'bg-[#ef4444]/20 text-[#ef4444]',
  medium: 'bg-[#f5a623]/20 text-[#f5a623]',
  low: 'bg-[#00d4aa]/20 text-[#00d4aa]',
};

const PRIORITY_LABELS: Record<string, string> = {
  high: t('tasks.priorityUrgent'),
  medium: t('tasks.priorityMedium'),
  low: t('tasks.priorityLow'),
};

const STATUS_STYLES: Record<string, string> = {
  on_track: 'text-[#00d4aa]',
  at_risk: 'text-[#f5a623]',
  ahead: 'text-[#7b6cf0]',
  off_track: 'text-[#ef4444]',
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
  if (progress >= 80) return '#00d4aa';
  if (progress >= 50) return '#f5a623';
  return '#ef4444';
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

  const tasks: QuickTask[] = useMemo(() => dbTasks.map((t) => ({
    id: t.id, title: t.title, priority: t.priority ?? 'medium', status: t.status, due_date: t.due_date ?? '',
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
    if (atRiskGoals.length > 0) items.push(`目标"${atRiskGoals[0].title}"进度滞后，建议本周聚焦推进`);
    const pendingHigh = tasks.filter((t) => t.priority === 'high' && t.status !== 'done');
    if (pendingHigh.length > 0) items.push(`有 ${pendingHigh.length} 个紧急任务待处理，建议优先安排`);
    const doneRate = tasks.length > 0 ? Math.round((tasks.filter((t) => t.status === 'done').length / tasks.length) * 100) : 0;
    if (tasks.length > 0) items.push(`当前任务完成率 ${doneRate}%，持续保持专注`);
    return items;
  }, [tasks, goals]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const pendingTasks = tasks.filter((t) => t.status !== 'done');
  const completedTasks = tasks.filter((t) => t.status === 'done');
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
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#eaecf4]">
            {getGreeting()}
          </h1>
          <p className="text-[#9ca3b8] mt-1">
            {now.toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
            &nbsp;&middot;&nbsp;
            {now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-[#7b6cf0]">{pendingTasks.length}</div>
          <div className="text-xs text-[#9ca3b8]">{t('myToday.pendingTasks')}</div>
        </div>
      </div>

      {/* Quick stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => goToModule('workspace', 'tasks')}
          className="bg-[#13161f] border border-[#2a2d3a] rounded-xl p-4 text-left hover:border-[#7b6cf0] transition-colors"
        >
          <div className="text-2xl font-bold text-[#7b6cf0]">{pendingTasks.length}</div>
          <div className="text-xs text-[#9ca3b8] mt-1">{t('myToday.todayPending')}</div>
        </button>

        <button
          onClick={() => goToModule('workspace', 'goals')}
          className="bg-[#13161f] border border-[#2a2d3a] rounded-xl p-4 text-left hover:border-[#00d4aa] transition-colors"
        >
          <div className="text-2xl font-bold text-[#00d4aa]">{completionRate}%</div>
          <div className="text-xs text-[#9ca3b8] mt-1">{t('myToday.completionRate')}</div>
        </button>

        <button
          onClick={() => goToModule('workspace', 'goals')}
          className="bg-[#13161f] border border-[#2a2d3a] rounded-xl p-4 text-left hover:border-[#f5a623] transition-colors"
        >
          <div className="text-2xl font-bold text-[#f5a623]">
            {goals.filter((g) => g.status === 'at_risk' || g.status === 'off_track').length}
          </div>
          <div className="text-xs text-[#9ca3b8] mt-1">{t('myToday.riskGoals')}</div>
        </button>

        <button
          onClick={() => goToModule('ai', 'main')}
          className="bg-[#13161f] border border-[#2a2d3a] rounded-xl p-4 text-left hover:border-[#7b6cf0] transition-colors"
        >
          <div className="text-2xl font-bold">🧠</div>
          <div className="text-xs text-[#9ca3b8] mt-1">{t('myToday.aiAssistant')}</div>
        </button>
      </div>

      {/* Priority Focus Section */}
      {focusPlan.length > 0 && (
        <div className="rounded-xl border border-[#2a2d3a] bg-[#13161f] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎯</span>
              <h2 className="text-lg font-semibold text-[#eaecf4]">{t('myToday.todayFocus')}</h2>
              <span className="rounded-full px-2 py-0.5 text-[9px] font-bold bg-[#7b6cf0]/10 text-[#7b6cf0]">{t('myToday.aiSorted')}</span>
            </div>
            <button
              onClick={() => goToModule('workspace', 'overview')}
              className="text-sm text-[#7b6cf0] hover:underline"
            >
              全部 →
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
                    isOverdue ? 'bg-[#ef4444]/5 border-[#ef4444]/20' :
                    isAtRisk ? 'bg-[#f5a623]/5 border-[#f5a623]/20' :
                    'bg-[#0d0f16] border-[#2a2d3a]'
                  }`}
                >
                  <span className="text-xs font-bold text-[#9ca3b8] w-4">{i + 1}</span>
                  <span className="text-sm">{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[#eaecf4] truncate">{item.title}</div>
                    <div className="flex items-center gap-2 text-[10px] text-[#9ca3b8]">
                      <span>{getItemTypeLabel(item.type)}</span>
                      <span>·</span>
                      <span>{item.reason}</span>
                      {isOverdue && <span className="text-[#ef4444] font-bold">{t('myToday.overdue')}</span>}
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    item.focusTag === 'urgent' ? 'bg-[#ef4444]/10 text-[#ef4444]' :
                    item.focusTag === 'important' ? 'bg-[#7b6cf0]/10 text-[#7b6cf0]' :
                    item.focusTag === 'momentum' ? 'bg-[#00d4aa]/10 text-[#00d4aa]' :
                    item.focusTag === 'low-hanging' ? 'bg-[#f5a623]/10 text-[#f5a623]' :
                    'bg-white/5 text-[#9ca3b8]'
                  }`}>{cfg.label}</span>
                  {isOverdue && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ef4444]/10 text-[#ef4444] font-bold shrink-0">{t('myToday.overdue')}</span>}
                  {isAtRisk && !isOverdue && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f5a623]/10 text-[#f5a623] font-bold shrink-0">{t('myToday.risk')}</span>}
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
            <h2 className="text-lg font-semibold text-[#eaecf4]">{t('myToday.todayTasks')}</h2>
            <button
              onClick={() => goToModule('workspace', 'tasks')}
              className="text-sm text-[#7b6cf0] hover:underline"
            >
              查看全部 →
            </button>
          </div>

          {pendingTasks.length === 0 && completedTasks.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-[#2a2d3a] border-dashed bg-[#0d0f16]">
              <div className="text-4xl mb-3">📋</div>
              <div className="text-sm text-[#9ca3b8] mb-4">{t('myToday.noTasks')}</div>
              <button
                onClick={() => goToModule('workspace', 'tasks')}
                className="rounded-lg bg-[#7b6cf0] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7b6cf0]/80 transition-colors"
              >
                创建第一个任务
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => goToModule('workspace', 'tasks')}
                className="w-full flex items-center gap-3 bg-[#13161f] border border-[#2a2d3a] rounded-lg p-3 text-left hover:border-[#7b6cf0]/50 transition-colors"
              >
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    task.priority === 'high'
                      ? 'bg-[#ef4444]'
                      : task.priority === 'medium'
                      ? 'bg-[#f5a623]'
                      : 'bg-[#00d4aa]'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[#eaecf4] truncate">{task.title}</div>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_STYLES[task.priority]}`}
                >
                  {PRIORITY_LABELS[task.priority]}
                </span>
                {task.due_date && (
                  <span className="text-xs text-[#9ca3b8] shrink-0">{task.due_date}</span>
                )}
              </button>
            ))}

            {completedTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 bg-[#0d0f16] rounded-lg p-3 opacity-60"
              >
                <div className="w-2 h-2 rounded-full bg-[#00d4aa] shrink-0" />
                <span className="text-sm text-[#9ca3b8] line-through flex-1 truncate">
                  {task.title}
                </span>
                <span className="text-xs text-[#00d4aa]">✓</span>
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
              <h2 className="text-lg font-semibold text-[#eaecf4]">{t('myToday.goalProgress')}</h2>
              <button
                onClick={() => goToModule('workspace', 'goals')}
                className="text-sm text-[#7b6cf0] hover:underline"
              >
                全部 →
              </button>
            </div>

            <div className="space-y-3">
              {goals.length === 0 ? (
                <div className="text-center py-8 rounded-xl border border-[#2a2d3a] border-dashed bg-[#0d0f16]">
                  <div className="text-3xl mb-2">🎯</div>
                  <div className="text-xs text-[#9ca3b8] mb-3">{t('myToday.setFirstGoal')}</div>
                  <button
                    onClick={() => goToModule('workspace', 'goals')}
                    className="rounded-lg bg-[#00d4aa] px-3 py-1.5 text-[10px] font-semibold text-[#0a0c12] hover:bg-[#00d4aa]/80 transition-colors"
                  >
                    创建目标
                  </button>
                </div>
              ) : goals.map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => goToModule('workspace', 'goals')}
                  className="w-full bg-[#13161f] border border-[#2a2d3a] rounded-lg p-3 text-left hover:border-[#7b6cf0]/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#eaecf4] truncate flex-1">{goal.title}</span>
                    <span className={`text-xs ml-2 ${STATUS_STYLES[goal.status]}`}>
                      {STATUS_LABELS[goal.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-[#1e2030] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${goal.progress}%`,
                          backgroundColor: getProgressColor(goal.progress),
                        }}
                      />
                    </div>
                    <span className="text-xs text-[#9ca3b8] w-8 text-right">{goal.progress}%</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-[#eaecf4]">{t('myToday.todayInsights')}</h2>
              <button
                onClick={() => goToModule('ai', 'morning')}
                className="text-sm text-[#7b6cf0] hover:underline"
              >
                早安简报 →
              </button>
            </div>

            <div className="space-y-2">
              {insights.length === 0 ? (
                <div className="bg-[#13161f] border border-[#2a2d3a] rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-[#7b6cf0] text-sm mt-0.5">💡</span>
                    <p className="text-sm text-[#9ca3b8] leading-relaxed">{t('myToday.createGoal')}和任务后，AI 将为你提供智能洞察和建议</p>
                  </div>
                </div>
              ) : insights.map((insight, i) => (
                <div
                  key={i}
                  className="bg-[#13161f] border border-[#2a2d3a] rounded-lg p-3"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-[#7b6cf0] text-sm mt-0.5">💡</span>
                    <p className="text-sm text-[#9ca3b8] leading-relaxed">{insight}</p>
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
