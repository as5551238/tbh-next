import { useState, useEffect, useCallback } from 'react';
import { fetchBehaviorEvents, summarizeEvents, setTrackingEnabled, isTrackingEnabled, type BehaviorEvent, type BehaviorSummary } from '@/lib/behaviorTracker';
import { Activity, BarChart3, ToggleLeft, ToggleRight, RefreshCw, Clock, Zap, Download, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportToCSV, exportToJSON } from '@/lib/export';
import { t } from '@/lib/i18n';

const EVENT_LABELS: Record<string, () => string> = {
  task_create: () => t('behavior.taskCreate'), task_update: () => t('behavior.taskUpdate'), task_complete: () => t('behavior.taskComplete'), task_delete: () => t('behavior.taskDelete'),
  goal_create: () => t('behavior.goalCreate'), goal_update: () => t('behavior.goalUpdate'), goal_complete: () => t('behavior.goalComplete'),
  project_create: () => t('behavior.projectCreate'), project_update: () => t('behavior.projectUpdate'), project_delete: () => t('behavior.projectDelete'),
  doc_create: () => t('behavior.docCreate'), doc_update: () => t('behavior.docUpdate'), doc_delete: () => t('behavior.docDelete'),
  template_create: () => t('behavior.templateCreate'), template_use: () => t('behavior.templateUse'), template_delete: () => t('behavior.templateDelete'),
  automation_rule_execute: () => t('behavior.automationExec'), automation_rule_create: () => t('behavior.automationCreate'),
  season_create: () => t('behavior.seasonCreate'), season_phase_advance: () => t('behavior.seasonPhase'),
  ai_chat: () => t('behavior.aiChat'), ai_tool_call: () => t('behavior.aiToolCall'),
  risk_create: () => t('behavior.riskCreate'), risk_resolve: () => t('behavior.riskResolve'),
  action_item_create: () => t('behavior.actionCreate'), action_item_complete: () => t('behavior.actionComplete'),
  report_generate: () => t('behavior.reportGenerate'), report_export: () => t('behavior.reportExport'),
  notification_read: () => t('behavior.notifRead'), notification_dismiss: () => t('behavior.notifDismiss'),
  page_view: () => t('behavior.pageView'), module_switch: () => t('behavior.moduleSwitch'),
  login: () => t('behavior.login'), logout: () => t('behavior.logout'),
};

const EVENT_COLORS: Record<string, string> = {
  task_create: 'bg-blue-500/20 text-blue-400',
  task_complete: 'bg-green-500/20 text-green-400',
  goal_complete: 'bg-emerald-500/20 text-emerald-400',
  project_create: 'bg-cyan-500/20 text-cyan-400',
  doc_create: 'bg-teal-500/20 text-teal-400',
  ai_chat: 'bg-purple-500/20 text-purple-400',
  risk_create: 'bg-red-500/20 text-red-400',
  report_generate: 'bg-amber-500/20 text-amber-400',
  automation_rule_execute: 'bg-orange-500/20 text-orange-400',
  season_create: 'bg-pink-500/20 text-pink-400',
  template_use: 'bg-indigo-500/20 text-indigo-400',
  notification_read: 'bg-sky-500/20 text-sky-400',
};

/** All unique event type categories for filtering */
const EVENT_CATEGORIES: { key: string; label: () => string }[] = [
  { key: 'all', label: () => t('behavior.catAll') },
  { key: 'task', label: () => t('behavior.catTask') },
  { key: 'goal', label: () => t('behavior.catGoal') },
  { key: 'project', label: () => t('behavior.catProject') },
  { key: 'doc', label: () => t('behavior.catDoc') },
  { key: 'template', label: () => t('behavior.catTemplate') },
  { key: 'automation', label: () => t('behavior.catAutomation') },
  { key: 'season', label: () => t('behavior.catSeason') },
  { key: 'ai', label: () => t('behavior.catAi') },
  { key: 'risk', label: () => t('behavior.catRisk') },
  { key: 'action', label: () => t('behavior.catAction') },
  { key: 'report', label: () => t('behavior.catReport') },
  { key: 'notification', label: () => t('behavior.catNotif') },
  { key: 'nav', label: () => t('behavior.catNav') },
];

function eventMatchesCategory(eventType: string, category: string): boolean {
  if (category === 'all') return true;
  return eventType.startsWith(category);
}

function eventLabelText(eventType: string): string {
  return EVENT_LABELS[eventType] ? EVENT_LABELS[eventType]() : eventType;
}

export default function BehaviorTrackerView() {
  const [events, setEvents] = useState<BehaviorEvent[]>([]);
  const [summary, setSummary] = useState<BehaviorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState(isTrackingEnabled());
  const [filterCat, setFilterCat] = useState('all');
  const [searchText, setSearchText] = useState('');

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

  // Filter events
  const filteredEvents = events.filter((e) => {
    if (!eventMatchesCategory(e.event_type, filterCat)) return false;
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      const label = eventLabelText(e.event_type);
      const detail = JSON.stringify(e.detail).toLowerCase();
      return label.toLowerCase().includes(q) || detail.includes(q);
    }
    return true;
  });

  // Export handlers
  const handleExportCSV = useCallback(() => {
    const headers = [t('behavior.expTime'), t('behavior.expEventType'), t('behavior.expDetail')];
    const rows = filteredEvents.map((e) => ({
      [t('behavior.expTime')]: new Date(e.timestamp).toLocaleString('zh-CN'),
      [t('behavior.expEventType')]: eventLabelText(e.event_type),
      [t('behavior.expDetail')]: JSON.stringify(e.detail),
    }));
    exportToCSV(headers, rows, 'behavior-events');
  }, [filteredEvents]);

  const handleExportJSON = useCallback(() => {
    const rows = filteredEvents.map((e) => ({
      timestamp: e.timestamp,
      event_type: e.event_type,
      detail: e.detail,
    }));
    exportToJSON(rows, 'behavior-events');
  }, [filteredEvents]);

  // Simple bar chart from byDay
  const dayEntries = summary ? Object.entries(summary.byDay).sort((a, b) => a[0].localeCompare(b[0])).slice(-14) : [];
  const maxDayCount = Math.max(...dayEntries.map(([, c]) => c), 1);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <Activity size={16} className="text-accent" />
        <span className="text-sm font-bold">{t('behavior.title')}</span>
        <span className="text-[10px] text-text-3">{t('behavior.recordCount', { filtered: filteredEvents.length, total: events.length })}</span>
        <button className={cn('flex items-center gap-1 rounded-lg px-3 py-1 text-[11px] font-semibold', tracking ? 'bg-success/10 text-success' : 'bg-surface-2 text-text-3')} onClick={handleToggleTracking}>
          {tracking ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
          {tracking ? t('behavior.trackingOn') : t('behavior.trackingOff')}
        </button>
        <button className="flex items-center gap-1 rounded-lg bg-surface-2 px-3 py-1 text-[11px] font-semibold text-text-3 hover:text-text" onClick={loadData}>
          <RefreshCw size={12} />{t('behavior.refresh')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
        {/* Summary stats */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="rounded-lg bg-surface p-3 text-center">
              <div className="text-lg font-bold text-primary-2">{summary.totalEvents}</div>
              <div className="text-[9px] text-text-3">{t('behavior.totalEvents')}</div>
            </div>
            <div className="rounded-lg bg-surface p-3 text-center">
              <div className="text-lg font-bold text-accent">{Object.keys(summary.byType).length}</div>
              <div className="text-[9px] text-text-3">{t('behavior.eventTypes')}</div>
            </div>
            <div className="rounded-lg bg-surface p-3 text-center">
              <div className="text-lg font-bold text-success">{Object.keys(summary.byDay).length}</div>
              <div className="text-[9px] text-text-3">{t('behavior.activeDays')}</div>
            </div>
            <div className="rounded-lg bg-surface p-3 text-center">
              <div className="text-lg font-bold text-warn">
                {summary.lastActiveAt ? new Date(summary.lastActiveAt).toLocaleDateString('zh-CN') : '-'}
              </div>
              <div className="text-[9px] text-text-3">{t('behavior.lastActive')}</div>
            </div>
          </div>
        )}

        {/* Activity bar chart */}
        {dayEntries.length > 0 && (
          <div className="rounded-xl border border-border bg-surface p-3">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 size={14} className="text-primary-2" />
              <span className="text-xs font-semibold text-text">{t('behavior.recentActivity')}</span>
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
              <span className="text-xs font-semibold text-text">{t('behavior.topActions')}</span>
            </div>
            <div className="space-y-1.5">
              {summary.topActions.map((a, i) => {
                const maxCount = summary.topActions[0].count;
                return (
                  <div key={a.action} className="flex items-center gap-2">
                    <span className="text-[10px] text-text-3 w-4 text-right">{i + 1}</span>
                    <span className="text-[10px] text-text min-w-[60px]">{eventLabelText(a.action)}</span>
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

        {/* Filter + Export toolbar */}
        <div className="rounded-xl border border-border bg-surface p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Filter size={12} className="text-text-3" />
            <span className="text-[10px] font-bold text-text-3 uppercase tracking-wider">{t('behavior.eventFilter')}</span>
            <div className="ml-auto flex gap-1">
              <button className="flex items-center gap-1 rounded-lg bg-surface-2 px-2 py-0.5 text-[9px] text-text-3 hover:text-text" onClick={handleExportCSV}>
                <Download size={9} />CSV
              </button>
              <button className="flex items-center gap-1 rounded-lg bg-surface-2 px-2 py-0.5 text-[9px] text-text-3 hover:text-text" onClick={handleExportJSON}>
                <Download size={9} />JSON
              </button>
            </div>
          </div>
          {/* Search */}
          <div className="relative">
            <input
              className="w-full rounded-lg bg-surface-2 border border-border/50 px-3 py-1.5 text-[11px] text-text placeholder-text-3 focus:outline-none focus:border-primary"
              placeholder={t('behavior.searchPlaceholder')}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            {searchText && <button className="absolute right-2 top-1/2 -translate-y-1/2 text-text-3 hover:text-text" onClick={() => setSearchText('')}><X size={12} /></button>}
          </div>
          {/* Category chips */}
          <div className="flex flex-wrap gap-1">
            {EVENT_CATEGORIES.map((c) => (
              <button
                key={c.key}
                className={cn('rounded-full px-2 py-0.5 text-[9px] font-semibold transition-colors', filterCat === c.key ? 'bg-primary/15 text-primary-2' : 'bg-surface-2 text-text-3 hover:text-text')}
                onClick={() => setFilterCat(c.key)}
              >
                {c.label()}
              </button>
            ))}
          </div>
        </div>

        {/* Event timeline */}
        <div>
          <div className="text-xs font-bold text-text-3 uppercase tracking-wider mb-2">{t('behavior.eventTimeline')}</div>
          {loading ? (
            <div className="text-[11px] text-text-3">{t('common.loading')}</div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-[11px] text-text-3">{events.length === 0 ? t('behavior.noData') : t('behavior.noMatch')}</div>
          ) : (
            <div className="space-y-1">
              {filteredEvents.slice(0, 50).map((e, i) => (
                <div key={`${e.timestamp}-${i}`} className="flex items-center gap-3 rounded-lg border border-border/50 bg-surface px-3 py-2">
                  <div className={cn('rounded-full px-1.5 py-0.5 text-[8px] font-bold shrink-0', EVENT_COLORS[e.event_type] ?? 'bg-surface-2 text-text-3')}>
                    {eventLabelText(e.event_type)}
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
