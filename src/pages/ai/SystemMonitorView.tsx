/**
 * SystemMonitorView — System Health Monitor + Version Management
 *
 * Features:
 * - System health snapshot (renders, API calls, errors)
 * - Cache stats
 * - Memory usage
 * - Feature flag overview
 * - Version info + changelog
 * - Monitor toggle (DR-51)
 * - Export diagnostics as JSON
 */
import { useState, useMemo, useCallback } from 'react';
import { t } from '@/lib/i18n';
import {
  isMonitorEnabled, setMonitorEnabled, getSystemHealthSnapshot, resetMetrics,
  APP_VERSION, VERSION_DATE, VERSION_LABEL, CHANGELOG,
  type SystemHealthSnapshot,
} from '@/lib/monitoring';
import { cacheStats, cacheClear, cacheDelete } from '@/lib/perfCache';
import { getFeatureFlagOverrides, FLAG_KEY_TO_FEATURE } from '@/lib/subscription';
import { getCurrentPlan, PLAN_LIMITS } from '@/lib/subscription';
import { Activity, Monitor, ToggleLeft, ToggleRight, Trash2, Download, CheckCircle2, AlertTriangle, XCircle, Package, Clock, Cpu, HardDrive } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SystemMonitorView() {
  const [monitorOn, setMonitorOn] = useState(() => isMonitorEnabled());
  const [snapshot, setSnapshot] = useState<SystemHealthSnapshot | null>(null);
  const [showChangelog, setShowChangelog] = useState(false);

  const takeSnapshot = useCallback(() => {
    setSnapshot(getSystemHealthSnapshot());
  }, []);

  const toggleMonitor = () => {
    const newVal = !monitorOn;
    setMonitorEnabled(newVal);
    setMonitorOn(newVal);
  };

  const handleReset = () => {
    resetMetrics();
    cacheClear();
    cacheDelete('command-center');
    setSnapshot(null);
  };

  const handleExport = () => {
    const data = getSystemHealthSnapshot();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tbh-diagnostics-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentPlan = getCurrentPlan();
  const planLimits = PLAN_LIMITS[currentPlan] ?? PLAN_LIMITS.free;
  const flagOverrides = getFeatureFlagOverrides();
  const stats = cacheStats();

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-3 md:p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Monitor size={18} className="text-primary-2" />
        <span className="text-sm font-bold">{t('sysMonitor.title')}</span>
        <span className="text-[10px] text-text-3">v{APP_VERSION}</span>
        <div className="ml-auto flex items-center gap-2">
          <button className="flex items-center gap-1 rounded-lg bg-surface-2 px-3 py-1 text-[11px] text-text-2 hover:bg-surface-2/80" onClick={toggleMonitor}>
            {monitorOn ? <ToggleRight size={14} className="text-success" /> : <ToggleLeft size={14} className="text-text-3" />}
            {monitorOn ? t('sysMonitor.monitorOn') : t('sysMonitor.monitorOff')}
          </button>
          <button className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20" onClick={takeSnapshot}>
            <Activity size={12} />{t('sysMonitor.takeSnapshot')}
          </button>
          <button className="flex items-center gap-1 rounded-lg bg-warn/10 px-3 py-1 text-[11px] text-warn hover:bg-warn/20" onClick={handleReset}>
            <Trash2 size={12} />{t('sysMonitor.reset')}
          </button>
          <button className="flex items-center gap-1 rounded-lg bg-surface-2 px-3 py-1 text-[11px] text-text-2 hover:bg-surface-2/80" onClick={handleExport}>
            <Download size={12} />{t('sysMonitor.export')}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-3 mb-3">
          <Package size={20} className="text-primary-2" />
          <div>
            <div className="text-sm font-bold text-text">{VERSION_LABEL}</div>
            <div className="text-[10px] text-text-3">v{APP_VERSION} · {VERSION_DATE}</div>
          </div>
          <button className={cn('ml-auto rounded-lg px-3 py-1 text-[10px] font-semibold', showChangelog ? 'bg-primary/10 text-primary-2' : 'bg-surface-2 text-text-2')} onClick={() => setShowChangelog(!showChangelog)}>
            {showChangelog ? t('sysMonitor.collapse') : t('sysMonitor.changelog')}
          </button>
        </div>

        {showChangelog && (
          <div className="space-y-3 mt-2 border-t border-border pt-3">
            {CHANGELOG.map((entry) => (
              <div key={entry.version}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-text">v{entry.version}</span>
                  <span className="text-[9px] text-text-3">{entry.date}</span>
                </div>
                <ul className="mt-1 space-y-0.5">
                  {entry.changes.map((c, i) => (
                    <li key={i} className="text-[10px] text-text-2">· {c}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="rounded-xl border border-border bg-surface p-3">
          <div className="flex items-center gap-1 mb-1"><Cpu size={12} className="text-primary-2" /><span className="text-[10px] text-text-3">{t('sysMonitor.uptime')}</span></div>
          <div className="text-sm font-bold text-text">{snapshot ? `${Math.round(snapshot.perfNow / 1000)}s` : '-'}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <div className="flex items-center gap-1 mb-1"><HardDrive size={12} className="text-accent" /><span className="text-[10px] text-text-3">{t('sysMonitor.memoryCache')}</span></div>
          <div className="text-sm font-bold text-text">{stats.memoryEntries} {t('sysMonitor.items')}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <div className="flex items-center gap-1 mb-1"><Package size={12} className="text-success" /><span className="text-[10px] text-text-3">{t('sysMonitor.sessionCache')}</span></div>
          <div className="text-sm font-bold text-text">{stats.sessionKeys} {t('sysMonitor.items')}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <div className="flex items-center gap-1 mb-1"><Activity size={12} className="text-warn" /><span className="text-[10px] text-text-3">{t('sysMonitor.currentPlan')}</span></div>
          <div className="text-sm font-bold text-text">{currentPlan}</div>
        </div>
      </div>

      {snapshot && (
        <>
          {snapshot.renders.length > 0 && (
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="text-xs font-bold text-text mb-2">{t('sysMonitor.renderPerf')}</div>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-1 text-left text-text-3 font-normal">{t('sysMonitor.component')}</th>
                      <th className="py-1 text-right text-text-3 font-normal">{t('sysMonitor.count')}</th>
                      <th className="py-1 text-right text-text-3 font-normal">{t('sysMonitor.avgMs')}</th>
                      <th className="py-1 text-right text-text-3 font-normal">{t('sysMonitor.maxMs')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.renders.slice(0, 10).map((r) => (
                      <tr key={r.componentName} className="border-b border-border/50">
                        <td className="py-1 text-text-2">{r.componentName}</td>
                        <td className="py-1 text-right text-text">{r.count}</td>
                        <td className={cn('py-1 text-right', r.avgMs > 50 ? 'text-danger' : r.avgMs > 16 ? 'text-warn' : 'text-success')}>{r.avgMs}</td>
                        <td className={cn('py-1 text-right', r.maxMs > 100 ? 'text-danger' : r.maxMs > 32 ? 'text-warn' : 'text-success')}>{r.maxMs}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {snapshot.apiCalls.length > 0 && (
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="text-xs font-bold text-text mb-2">{t('sysMonitor.apiStats')}</div>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-1 text-left text-text-3 font-normal">{t('sysMonitor.endpoint')}</th>
                      <th className="py-1 text-right text-text-3 font-normal">{t('sysMonitor.success')}</th>
                      <th className="py-1 text-right text-text-3 font-normal">{t('sysMonitor.failure')}</th>
                      <th className="py-1 text-right text-text-3 font-normal">{t('sysMonitor.avgMs')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.apiCalls.slice(0, 10).map((a) => (
                      <tr key={a.endpoint} className="border-b border-border/50">
                        <td className="py-1 text-text-2 max-w-[120px] truncate">{a.endpoint}</td>
                        <td className="py-1 text-right text-success">{a.successCount}</td>
                        <td className="py-1 text-right text-danger">{a.failureCount}</td>
                        <td className="py-1 text-right text-text">{a.avgMs}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {snapshot.errors.length > 0 && (
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="text-xs font-bold text-text mb-2">{t('sysMonitor.errorLog')}</div>
              <div className="space-y-1.5">
                {snapshot.errors.map((e) => (
                  <div key={e.id} className="flex items-start gap-2 rounded-lg bg-danger/5 px-3 py-2">
                    <XCircle size={12} className="text-danger shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-[10px] text-text">{e.message}</div>
                      <div className="text-[9px] text-text-3">{t('sysMonitor.source')}: {e.source} · {t('sysMonitor.occurrences')}: {e.count} · {t('sysMonitor.lastOccurrence')}: {new Date(e.lastOccurrence).toLocaleString('zh-CN')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold text-text">{t('sysMonitor.featureFlags')}</span>
          <span className="text-[9px] text-text-3">({Object.keys(FLAG_KEY_TO_FEATURE).length} {t('sysMonitor.items')})</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
          {Object.entries(FLAG_KEY_TO_FEATURE).map(([flagKey, featureKey]) => {
            const overridden = flagKey in flagOverrides && flagOverrides[flagKey as keyof typeof flagOverrides] === false;
            const planAllows = !!planLimits[featureKey];
            const effective = !overridden && planAllows;
            return (
              <div key={flagKey} className={cn('rounded-lg border px-2 py-1.5', effective ? 'border-success/20 bg-success/5' : 'border-border bg-surface-2')}>
                <div className="flex items-center gap-1">
                  {effective ? <CheckCircle2 size={10} className="text-success" /> : <XCircle size={10} className="text-text-3" />}
                  <span className="text-[9px] text-text-2">{flagKey}</span>
                </div>
                {overridden && <div className="text-[8px] text-warn">{t('sysMonitor.adminDisabled')}</div>}
                {!planAllows && !overridden && <div className="text-[8px] text-text-3">{t('sysMonitor.needUpgrade')}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {snapshot?.memoryUsage && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-xs font-bold text-text mb-2">{t('sysMonitor.memoryUsage')}</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-sm font-bold text-text">{(snapshot.memoryUsage.usedJSHeapSize / 1048576).toFixed(1)} MB</div>
              <div className="text-[9px] text-text-3">{t('sysMonitor.used')}</div>
            </div>
            <div>
              <div className="text-sm font-bold text-text">{(snapshot.memoryUsage.totalJSHeapSize / 1048576).toFixed(1)} MB</div>
              <div className="text-[9px] text-text-3">{t('sysMonitor.allocated')}</div>
            </div>
            <div>
              <div className="text-sm font-bold text-text">{(snapshot.memoryUsage.jsHeapSizeLimit / 1048576).toFixed(0)} MB</div>
              <div className="text-[9px] text-text-3">{t('sysMonitor.limit')}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
