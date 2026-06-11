/**
 * Employee Simple View — 聚焦自身任务的精简视图.
 *
 * 设计原则:
 * - 只看与自己相关的任务 (assignee_id = me)
 * - 3个分区: 今日待办 / 进行中 / 已完成
 * - 无管理功能按钮 (无创建/分配/删除)
 * - 支持意图解析直接创建任务 (从AI聊天)
 */

import { useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { useTasks, useGoals, useActionItems } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, AlertTriangle, Target, Zap, ListTodo } from 'lucide-react';

interface TaskCardProps {
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  goalTitle?: string;
}

function TaskCard({ title, status, priority, dueDate, goalTitle }: TaskCardProps) {
  const priorityStyle = priority === 'urgent' ? 'bg-danger/10 text-danger border-danger/20' : priority === 'high' ? 'bg-warn/10 text-warn border-warn/20' : 'bg-surface-2 text-text-2 border-border';
  const isOverdue = dueDate && dueDate < new Date().toISOString().slice(0, 10) && status !== 'done';

  return (
    <div className={cn('rounded-lg border px-3 py-2.5 transition-all hover:shadow-sm', priorityStyle)}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-text leading-relaxed">{title}</span>
        {priority === 'urgent' && <AlertTriangle size={12} className="shrink-0 text-danger" />}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-text-3">
        {dueDate && (
          <span className={cn('flex items-center gap-0.5', isOverdue && 'text-danger font-semibold')}>
            <Clock size={10} />
            {isOverdue ? '逾期' : dueDate}
          </span>
        )}
        {goalTitle && (
          <span className="flex items-center gap-0.5">
            <Target size={10} />
            {goalTitle}
          </span>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof CheckCircle2; color: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-surface-2 px-3 py-2.5">
      <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', color)}>
        <Icon size={14} />
      </div>
      <div>
        <div className="text-sm font-bold text-text">{value}</div>
        <div className="text-[10px] text-text-3">{label}</div>
      </div>
    </div>
  );
}

export default function MyWorkView() {
  const { user } = useAuth();
  const { tasks } = useTasks();
  const { goals } = useGoals();
  const { actionItems } = useActionItems();
  const storeNavigateTo = useAppStore((s) => s.navigateTo);
  const navigate = useAppStore((s) => s.navigateTo);

  const today = new Date().toISOString().slice(0, 10);

  // Filter tasks assigned to me
  const myTasks = useMemo(() => {
    if (!user?.id) return tasks.slice(0, 10);
    return tasks.filter((t) => t.assignee_id === user.id || t.leader_id === user.id);
  }, [tasks, user?.id]);

  const todayTasks = useMemo(() => myTasks.filter((t) => t.due_date === today && !t.done), [myTasks, today]);
  const inProgressTasks = useMemo(() => myTasks.filter((t) => t.status === 'in_progress' && !t.done), [myTasks]);
  const doneTasks = useMemo(() => myTasks.filter((t) => t.done).slice(0, 5), [myTasks]);
  const overdueTasks = useMemo(() => myTasks.filter((t) => !t.done && t.due_date && t.due_date < today && t.status !== 'cancelled'), [myTasks, today]);
  const myActionItems = useMemo(() => actionItems.filter((a) => a.status === 'open' || a.status === 'in_progress').slice(0, 5), [actionItems]);

  const goalMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of goals) m.set(g.id, g.title);
    return m;
  }, [goals]);

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-text">我的工作</h1>
        <p className="text-xs text-text-3 mt-0.5">聚焦你的任务和目标进展</p>
      </div>

      {/* 今日3件事 — 集中精力最高优先级任务 */}
      {todayTasks.length > 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-primary-2 mb-2.5">
            <Zap size={14} />
            今日3件事
          </div>
          <div className="space-y-1.5">
            {todayTasks.slice(0, 3).map((t, i) => (
              <div key={t.id} className="flex items-center gap-2.5 rounded-lg bg-surface px-3 py-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary-2">{i + 1}</span>
                <span className="text-xs font-medium text-text flex-1 truncate">{t.title}</span>
                {t.priority === 'urgent' && <span className="rounded-full bg-danger/10 px-1.5 py-0.5 text-[9px] font-bold text-danger">紧急</span>}
                {t.priority === 'high' && <span className="rounded-full bg-warn/10 px-1.5 py-0.5 text-[9px] font-bold text-warn">高优</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 我的目标进度 */}
      {goals.filter((g) => g.status === 'in_progress' || g.status === 'active').length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-text mb-2 flex items-center gap-1.5">
            <Target size={14} className="text-primary-2" />
            我的目标
          </h2>
          <div className="space-y-2">
            {goals.filter((g) => g.status === 'in_progress' || g.status === 'active').slice(0, 3).map((g) => {
              const pct = Math.min(100, Math.max(0, g.progress || 0));
              const barColor = pct >= 70 ? 'bg-success' : pct >= 40 ? 'bg-warn' : 'bg-danger';
              return (
                <div key={g.id} className="rounded-lg border border-border bg-surface px-3 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-text truncate max-w-[80%]">{g.title}</span>
                    <span className="text-[10px] font-bold text-text-3">{pct}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-surface-2 overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="今日待办" value={todayTasks.length} icon={ListTodo} color="bg-primary/10 text-primary-2" />
        <StatCard label="进行中" value={inProgressTasks.length} icon={Clock} color="bg-warn/10 text-warn" />
        <StatCard label="逾期" value={overdueTasks.length} icon={AlertTriangle} color="bg-danger/10 text-danger" />
        <StatCard label="已完成" value={doneTasks.length} icon={CheckCircle2} color="bg-success/10 text-success" />
      </div>

      {/* Overdue alerts */}
      {overdueTasks.length > 0 && (
        <div className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-danger mb-2">
            <AlertTriangle size={13} />
            {overdueTasks.length}个逾期任务
          </div>
          <div className="space-y-1.5">
            {overdueTasks.slice(0, 3).map((t) => (
              <TaskCard key={t.id} title={t.title} status={t.status} priority={t.priority} dueDate={t.due_date} goalTitle={t.goal_id ? goalMap.get(t.goal_id) : undefined} />
            ))}
          </div>
        </div>
      )}

      {/* Today tasks */}
      {todayTasks.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-text mb-2 flex items-center gap-1.5">
            <ListTodo size={14} className="text-primary-2" />
            今日待办
          </h2>
          <div className="space-y-1.5">
            {todayTasks.map((t) => (
              <TaskCard key={t.id} title={t.title} status={t.status} priority={t.priority} dueDate={t.due_date} goalTitle={t.goal_id ? goalMap.get(t.goal_id) : undefined} />
            ))}
          </div>
        </div>
      )}

      {/* In progress */}
      {inProgressTasks.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-text mb-2 flex items-center gap-1.5">
            <Clock size={14} className="text-warn" />
            进行中
          </h2>
          <div className="space-y-1.5">
            {inProgressTasks.slice(0, 8).map((t) => (
              <TaskCard key={t.id} title={t.title} status={t.status} priority={t.priority} dueDate={t.due_date} goalTitle={t.goal_id ? goalMap.get(t.goal_id) : undefined} />
            ))}
          </div>
        </div>
      )}

      {/* Action items */}
      {myActionItems.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-text mb-2 flex items-center gap-1.5">
            <Zap size={14} className="text-accent" />
            待办行动项
          </h2>
          <div className="space-y-1.5">
            {myActionItems.map((a) => (
              <div key={a.id} className="rounded-lg border border-border bg-surface-2 px-3 py-2">
                <div className="text-xs text-text">{a.title}</div>
                <div className="text-[10px] text-text-3 mt-0.5">优先级: {a.priority} / 状态: {a.status}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {doneTasks.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-text-3 mb-2 flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-success" />
            最近完成
          </h2>
          <div className="space-y-1.5 opacity-60">
            {doneTasks.map((t) => (
              <TaskCard key={t.id} title={t.title} status={t.status} priority={t.priority} dueDate={t.due_date} goalTitle={t.goal_id ? goalMap.get(t.goal_id) : undefined} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {myTasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-4xl mb-3">📋</div>
          <div className="text-sm font-semibold text-text">暂无任务</div>
          <div className="text-xs text-text-3 mt-1">通过AI助手创建任务，或联系管理员分配</div>
        </div>
      )}
    </div>
  );
}
