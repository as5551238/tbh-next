import { useState, useEffect, useCallback } from 'react';
import { fetchBehaviorEvents, summarizeEvents, setTrackingEnabled, isTrackingEnabled, type BehaviorEvent, type BehaviorSummary } from '@/lib/behaviorTracker';
import { Activity, BarChart3, ToggleLeft, ToggleRight, RefreshCw, Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const EVENT_LABELS: Record<string, string> = {
  task_create: '创建任务', task_update: '更新任务', task_complete: '完成任务', task_delete: '删除任务',
  goal_create: '创建目标', goal_update: '更新目标', goal_complete: '完成目标',
  ai_chat: 'AI对话', ai_tool_call: 'AI工具调用',
  risk_create: '创建风险', risk_resolve: '解决风险',
  action_item_create: '创建行动项', action_item_complete: '完成行动项',
  report_generate: '生成报表', report_export: '导出报表',
  page_view: '页面访问', module_switch: '模块切换',
  login: '登录', logout: '登出',
};

const EVENT_COLORS: Record<string, string> = {
  task_create: 'bg-blue-500/20 text-blue-400',
  task_complete: 'bg-green-500/20 text-green-400',
  goal_complete: 'bg-emerald-500/20 text-emerald-400',
  ai_chat: 'bg-purple-500/20 text-purple-400',
  risk_create: 'bg-red-500/20 text-red-400',
  report_generate: 'bg-amber-500/20 text-amber-400',
};

export default function BehaviorTrackerView() {
  const [events, setEvents] = useState<BehaviorEvent[]>([]);
  const [summary, setSummary] = useState<BehaviorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState(isTrackingEnabled());

  const loadData = useCallback(async () => {
    setLoading(true);
    const evts = await fetchBehaviorEvents(200);
    setEvents(evts);
    setSummary(summarizeEvents(evts));
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleToggleTracking = useCallback(() => {
    const next = !tracking;
    setTrackingEnabled(next);
    setTracking(next);
  }, [tracking]);

  // Simple bar chart from byDay
  const dayEntries = summary ? Object.entries(summary.byDay).sort((a, b) => a[0].localeCompare(b[0])).slice(-14) : [];
  const maxDayCount = Math.max(...dayEntries.map(([, c]) => c), 1);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <Activity size={16} className="text-accent" />
        <span className="text-sm font-bold">行为追踪</span>
        <span className="text-[10px] text-text-3">{events.length} 条记录</span>
        <button className={cn('flex items-center gap-1 rounded-lg px-3 py-1 text-[11px] font-semibold', tracking ? 'bg-success/10 text-success' : 'bg-surface-2 text-text-3')} onClick={handleToggleTracking}>
          {tracking ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
          {tracking ? '追踪: 开' : '追踪: 关'}
        </button>
        <button className="flex items-center gap-1 rounded-lg bg-surface-2 px-3 py-1 text-[11px] font-semibold text-text-3 hover:text-text" onClick={loadData}>
          <RefreshCw size={12} />刷新
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
        {/* Summary stats */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="rounded-lg bg-surface p-3 text-center">
              <div className="text-lg font-bold text-primary-2">{summary.totalEvents}</div>
              <div className="text-[9px] text-text-3">总事件数</div>
            </div>
            <div className="rounded-lg bg-surface p-3 text-center">
              <div className="text-lg font-bold text-accent">{Object.keys(summary.byType).length}</div>
              <div className="text-[9px] text-text-3">事件类型</div>
            </div>
            <div className="rounded-lg bg-surface p-3 text-center">
              <div className="text-lg font-bold text-success">{Object.keys(summary.byDay).length}</div>
              <div className="text-[9px] text-text-3">活跃天数</div>
            </div>
            <div className="rounded-lg bg-surface p-3 text-center">
              <div className="text-lg font-bold text-warn">
                {summary.lastActiveAt ? new Date(summary.lastActiveAt).toLocaleDateString('zh-CN') : '-'}
              </div>
              <div className="text-[9px] text-text-3">最近活跃</div>
            </div>
          </div>
        )}

        {/* Activity bar chart */}
        {dayEntries.length > 0 && (
          <div className="rounded-xl border border-border bg-surface p-3">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 size={14} className="text-primary-2" />
              <span className="text-xs font-semibold text-text">近14天活跃度</span>
            </div>
            <div className="flex items-end gap-1 h-20">
              {dayEntries.map(([day, count]) => (
                <div key={day} className="flex-1 flex flex-col items-center gap-0.5">
                  <span className="text-[8px] text-text-3">{count}</span>
                  <div className="w-full rounded-t bg-primary-2/60 transition-all" style={{ height: `${Math.max((count / maxDayCount) * 60, 2)}px` }} />
                  <span className="text-[7px] text-text-3">{day.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top actions */}
        {summary && summary.topActions.length > 0 && (
          <div className="rounded-xl border border-border bg-surface p-3">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={14} className="text-accent" />
              <span className="text-xs font-semibold text-text">高频操作 TOP10</span>
            </div>
            <div className="space-y-1.5">
              {summary.topActions.map((a, i) => {
                const maxCount = summary.topActions[0].count;
                return (
                  <div key={a.action} className="flex items-center gap-2">
                    <span className="text-[10px] text-text-3 w-4 text-right">{i + 1}</span>
                    <span className="text-[10px] text-text min-w-[60px]">{EVENT_LABELS[a.action] ?? a.action}</span>
                    <div className="flex-1 h-3 rounded-full bg-surface-2 overflow-hidden">
                      <div className="h-full rounded-full bg-accent/60 transition-all" style={{ width: `${(a.count / maxCount) * 100}%` }} />
                    </div>
                    <span className="text-[9px] text-text-3 w-6 text-right">{a.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Event timeline */}
        <div>
          <div className="text-xs font-bold text-text-3 uppercase tracking-wider mb-2">事件时间线</div>
          {loading ? (
            <div className="text-[11px] text-text-3">加载中...</div>
          ) : events.length === 0 ? (
            <div className="text-[11px] text-text-3">暂无行为追踪数据</div>
          ) : (
            <div className="space-y-1">
              {events.slice(0, 50).map((e, i) => (
                <div key={`${e.timestamp}-${i}`} className="flex items-center gap-3 rounded-lg border border-border/50 bg-surface px-3 py-2">
                  <div className={cn('rounded-full px-1.5 py-0.5 text-[8px] font-bold shrink-0', EVENT_COLORS[e.event_type] ?? 'bg-surface-2 text-text-3')}>
                    {EVENT_LABELS[e.event_type] ?? e.event_type}
                  </div>
                  <span className="text-[10px] text-text-2 truncate flex-1">
                    {JSON.stringify(e.detail).slice(0, 80)}
                  </span>
                  <span className="text-[9px] text-text-3 shrink-0 flex items-center gap-1">
                    <Clock size={9} />{new Date(e.timestamp).toLocaleString('zh-CN')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
