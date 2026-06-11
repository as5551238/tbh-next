/**
 * CommandCenterView — 全景指挥中心
 *
 * A unified dashboard integrating Goals/Tasks/Risks/ActionItems/Automation/Alerts.
 * Designed as the "single pane of glass" for team leads and managers.
 *
 * Features:
 * - KPI summary cards with trend indicators
 * - Goal health radar (on-track/at-risk/overdue)
 * - Task pipeline visualization
 * - Risk alerts from riskEngine
 * - Quick action shortcuts
 * - Cached data loading via perfCache
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAppStore } from '@/stores/appStore';
import { useGoals, useTasks, useActionItems, useDeviationAlerts, useMembers } from '@/hooks/useMatrix';
import { loadChains, loadExecutionLogs, loadUsageAlerts } from '@/lib/automationEngine';
import { cacheGet } from '@/lib/perfCache';
import { recordRender } from '@/lib/monitoring';
import { Target, CheckCircle2, AlertTriangle, Clock, Zap, Users, TrendingUp, TrendingDown, Minus, ArrowRight, Shield, GitBranch, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CardSkeleton } from '@/components/Skeleton';

const CACHE_KEY = 'command-center';

interface KpiCard {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  trend?: 'up' | 'down' | 'flat';
  color?: string;
}

export default function CommandCenterView() {
  const navigateTo = useAppStore((s) => s.navigateTo);
  const { goals, loading: goalsLoading } = useGoals();
  const { tasks, loading: tasksLoading } = useTasks();
  const { actionItems, loading: aiLoading } = useActionItems();
  const { alerts, loading: alertsLoading } = useDeviationAlerts();

  // ── Monitor: render timing ──────────────────────────────────────────
  const _mountT0 = useMemo(() => performance.now(), []);
  useEffect(() => { return () => { recordRender('CommandCenterView', performance.now() - _mountT0); }; }, [_mountT0]);
  const { members, loading: membersLoading } = useMembers();

  const loading = goalsLoading || tasksLoading || aiLoading || alertsLoading || membersLoading;

  const now = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => now.toISOString().slice(0, 10), [now]);

  // ── Computed KPIs ───────────────────────────────────────────────────

  const kpis = useMemo((): KpiCard[] => {
    if (loading) return [];

    const activeGoals = goals.filter(g => g.status !== 'cancelled');
    const completedGoals = goals.filter(g => g.status === 'completed');
    const completedTasks = tasks.filter(t => t.status === 'done' || t.status === 'completed');
    const overdueTasks = tasks.filter(t => (t.status !== 'done' && t.status !== 'completed') && t.due_date && t.due_date.slice(0, 10) < todayStr);
    const atRiskGoals = activeGoals.filter(g => {
      if (!g.start_date || !g.end_date || g.progress >= 100) return false;
      const start = new Date(g.start_date).getTime();
      const end = new Date(g.end_date).getTime();
      const elapsed = (now.getTime() - start) / (end - start);
      return g.progress < Math.min(1, Math.max(0, elapsed)) * 100 - 15;
    });
    const openActionItems = actionItems.filter(a => a.status === 'open');
    const unreadAlerts = alerts.filter(a => !a.is_read);

    const goalRate = activeGoals.length > 0 ? Math.round(completedGoals.length / goals.length * 100) : 0;
    const taskRate = tasks.length > 0 ? Math.round(completedTasks.length / tasks.length * 100) : 0;

    return [
      { icon: <Target size={16} />, label: '目标完成率', value: `${goalRate}%`, sub: `${completedGoals.length}/${goals.length}`, trend: goalRate >= 70 ? 'up' : goalRate >= 40 ? 'flat' : 'down', color: goalRate >= 70 ? 'var(--status-success)' : goalRate >= 40 ? 'var(--color-warn)' : 'var(--color-danger)' },
      { icon: <CheckCircle2 size={16} />, label: '任务完成率', value: `${taskRate}%`, sub: `${completedTasks.length}/${tasks.length}`, trend: taskRate >= 70 ? 'up' : taskRate >= 40 ? 'flat' : 'down', color: taskRate >= 70 ? 'var(--status-success)' : taskRate >= 40 ? 'var(--color-warn)' : 'var(--color-danger)' },
      { icon: <AlertTriangle size={16} />, label: '逾期任务', value: overdueTasks.length, sub: overdueTasks.length > 0 ? '需关注' : '全部正常', color: overdueTasks.length > 0 ? 'var(--color-danger)' : 'var(--status-success)' },
      { icon: <Clock size={16} />, label: '风险目标', value: atRiskGoals.length, sub: atRiskGoals.length > 0 ? '偏离轨道' : '全部正常', color: atRiskGoals.length > 0 ? 'var(--color-warn)' : 'var(--status-success)' },
      { icon: <Zap size={16} />, label: '待办行动项', value: openActionItems.length, sub: `${actionItems.filter(a => a.priority === 'critical').length} 紧急`, color: openActionItems.length > 10 ? 'var(--color-danger)' : 'var(--color-warn)' },
      { icon: <Shield size={16} />, label: '偏差预警', value: unreadAlerts.length, sub: `${alerts.length} 总计`, color: unreadAlerts.length > 0 ? 'var(--color-danger)' : 'var(--status-success)' },
    ];
  }, [goals, tasks, actionItems, alerts, loading, todayStr, now]);

  // ── Goal Health Distribution ────────────────────────────────────────

  const goalHealth = useMemo(() => {
    if (goalsLoading) return { onTrack: 0, atRisk: 0, overdue: 0, completed: 0 };
    const active = goals.filter(g => g.status !== 'cancelled');
    const completed = goals.filter(g => g.status === 'completed').length;
    const atRisk = active.filter(g => {
      if (!g.start_date || !g.end_date || g.progress >= 100) return false;
      const s = new Date(g.start_date).getTime();
      const e = new Date(g.end_date).getTime();
      return g.progress < Math.min(1, Math.max(0, (now.getTime() - s) / (e - s))) * 100 - 15;
    }).length;
    const overdue = active.filter(g => g.end_date && g.end_date.slice(0, 10) < todayStr && g.progress < 100).length;
    const onTrack = active.length - atRisk - overdue;
    return { onTrack, atRisk, overdue, completed };
  }, [goals, goalsLoading, now, todayStr]);

  // ── Task Pipeline ───────────────────────────────────────────────────

  const taskPipeline = useMemo(() => {
    if (tasksLoading) return [];
    const statusCount: Record<string, number> = {};
    for (const t of tasks) {
      const s = t.status || 'todo';
      statusCount[s] = (statusCount[s] || 0) + 1;
    }
    return Object.entries(statusCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([status, count]) => ({ status, count }));
  }, [tasks, tasksLoading]);

  // ── Automation Stats ────────────────────────────────────────────────

  const automationStats = useMemo(() => {
    const chains = loadChains();
    const logs = loadExecutionLogs();
    const recentLogs = logs.filter(l => {
      const d = new Date(l.executedAt);
      return (now.getTime() - d.getTime()) < 7 * 24 * 3600000;
    });
    return {
      activeChains: chains.filter(c => c.isActive).length,
      totalChains: chains.length,
      executionsThisWeek: recentLogs.length,
      successRate: recentLogs.length > 0
        ? Math.round(recentLogs.filter(l => l.status === 'success').length / recentLogs.length * 100)
        : 100,
    };
  }, [now]);

  // ── Usage Alerts Summary ────────────────────────────────────────────

  const usageAlerts = useMemo(() => loadUsageAlerts().filter(a => !a.isRead).length, []);

  // ── Quick Actions ───────────────────────────────────────────────────

  const quickActions = useMemo(() => [
    { icon: <Target size={14} />, label: '查看目标', module: 'goals', iface: 'workspace' },
    { icon: <CheckCircle2 size={14} />, label: '任务中心', module: 'tasks', iface: 'workspace' },
    { icon: <AlertTriangle size={14} />, label: '风险预警', module: 'risk', iface: 'ai' },
    { icon: <Zap size={14} />, label: '行动项', module: 'actionItems', iface: 'workspace' },
    { icon: <GitBranch size={14} />, label: '跨部门自动化', module: 'crossDeptAutomation', iface: 'ai' },
    { icon: <Shield size={14} />, label: '用量预警', module: 'usageAlerts', iface: 'ai' },
    { icon: <Activity size={14} />, label: '复盘', module: 'review', iface: 'workspace' },
    { icon: <TrendingUp size={14} />, label: '报表', module: 'reports', iface: 'workspace' },
  ], []);

  if (loading) return <CardSkeleton />;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-3 md:p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <TrendingUp size={18} className="text-primary-2" />
        <span className="text-sm font-bold">全景指挥中心</span>
        <span className="ml-auto text-[10px] text-text-3">{members.length} 成员 · {new Date().toLocaleDateString('zh-CN')}</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-border bg-surface p-3 cursor-pointer hover:shadow-lg transition-all" onClick={() => { /* Navigate to relevant module */ }}>
            <div className="flex items-center gap-1.5 mb-1">
              <span style={{ color: kpi.color }}>{kpi.icon}</span>
              <span className="text-[10px] text-text-3">{kpi.label}</span>
              {kpi.trend === 'up' && <TrendingUp size={10} className="text-success" />}
              {kpi.trend === 'down' && <TrendingDown size={10} className="text-danger" />}
              {kpi.trend === 'flat' && <Minus size={10} className="text-warn" />}
            </div>
            <div className="text-xl font-extrabold text-text" style={{ color: kpi.color || undefined }}>{kpi.value}</div>
            {kpi.sub && <div className="text-[9px] text-text-3 mt-0.5">{kpi.sub}</div>}
          </div>
        ))}
      </div>

      {/* Goal Health + Task Pipeline Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Goal Health */}
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-xs font-bold text-text mb-3">目标健康分布</div>
          <div className="space-y-2">
            {[
              { label: '正常推进', count: goalHealth.onTrack, color: 'bg-success', textColor: 'text-success' },
              { label: '偏离风险', count: goalHealth.atRisk, color: 'bg-warn', textColor: 'text-warn' },
              { label: '已逾期', count: goalHealth.overdue, color: 'bg-danger', textColor: 'text-danger' },
              { label: '已完成', count: goalHealth.completed, color: 'bg-primary', textColor: 'text-primary-2' },
            ].map(item => {
              const total = Math.max(1, goalHealth.onTrack + goalHealth.atRisk + goalHealth.overdue + goalHealth.completed);
              const pct = (item.count / total) * 100;
              return (
                <div key={item.label} className="flex items-center gap-2">
                  <span className={cn('w-2 h-2 rounded-full', item.color)} />
                  <span className="text-[10px] text-text-2 w-16">{item.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-surface-2">
                    <div className={cn('h-full rounded-full transition-all', item.color)} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={cn('text-xs font-semibold w-6 text-right', item.textColor)}>{item.count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Task Pipeline */}
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-xs font-bold text-text mb-3">任务状态分布</div>
          <div className="space-y-2">
            {taskPipeline.length === 0 ? (
              <div className="text-[10px] text-text-3">暂无任务数据</div>
            ) : (
              taskPipeline.map(({ status, count }) => {
                const total = Math.max(1, tasks.length);
                const pct = (count / total) * 100;
                const statusLabel: Record<string, string> = { todo: '待办', in_progress: '进行中', done: '已完成', completed: '已完成', review: '评审中', blocked: '阻塞' };
                const statusColor: Record<string, string> = { todo: 'bg-text-3', in_progress: 'bg-primary', done: 'bg-success', completed: 'bg-success', review: 'bg-accent', blocked: 'bg-danger' };
                return (
                  <div key={status} className="flex items-center gap-2">
                    <span className={cn('w-2 h-2 rounded-full', statusColor[status] || 'bg-text-3')} />
                    <span className="text-[10px] text-text-2 w-16">{statusLabel[status] || status}</span>
                    <div className="flex-1 h-2 rounded-full bg-surface-2">
                      <div className={cn('h-full rounded-full transition-all', statusColor[status] || 'bg-text-3')} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-text w-6 text-right">{count}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Automation & Alerts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Automation Summary */}
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2 mb-3">
            <GitBranch size={14} className="text-primary-2" />
            <span className="text-xs font-bold text-text">自动化概览</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-extrabold text-text">{automationStats.activeChains}</div>
              <div className="text-[9px] text-text-3">活跃规则链</div>
            </div>
            <div>
              <div className="text-lg font-extrabold text-text">{automationStats.executionsThisWeek}</div>
              <div className="text-[9px] text-text-3">本周执行</div>
            </div>
            <div>
              <div className={cn('text-lg font-extrabold', automationStats.successRate >= 90 ? 'text-success' : 'text-warn')}>
                {automationStats.successRate}%
              </div>
              <div className="text-[9px] text-text-3">成功率</div>
            </div>
          </div>
        </div>

        {/* Alerts Summary */}
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={14} className="text-warn" />
            <span className="text-xs font-bold text-text">预警汇总</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <div className="text-lg font-extrabold text-danger">{alerts.filter(a => !a.is_read).length}</div>
              <div className="text-[9px] text-text-3">未读偏差</div>
            </div>
            <div>
              <div className={cn('text-lg font-extrabold', usageAlerts > 0 ? 'text-warn' : 'text-success')}>
                {usageAlerts}
              </div>
              <div className="text-[9px] text-text-3">用量预警</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="text-xs font-bold text-text mb-3">快速导航</div>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {quickActions.map((qa) => (
            <button
              key={qa.module}
              className="flex flex-col items-center gap-1 rounded-lg py-2 px-1 text-text-2 hover:bg-primary/10 hover:text-primary-2 transition-colors"
              onClick={() => navigateTo(qa.iface, qa.module)}
            >
              {qa.icon}
              <span className="text-[9px]">{qa.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
