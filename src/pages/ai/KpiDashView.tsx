import { useState, useMemo } from 'react';
import { useMatrixCell, useIndustryColor } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, BarChart3, Target, Edit3, ChevronDown, ChevronUp, Check, X, Lock } from 'lucide-react';
import { hasFeature } from '@/lib/subscription';
import PaywallModal from '@/components/PaywallModal';

const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus };

export default function KpiDashView() {
  const indColor = useIndustryColor();
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);
  const { cell, loading } = useMatrixCell();
  const [expandedKpi, setExpandedKpi] = useState<string | null>(null);
  const [editingTarget, setEditingTarget] = useState<string | null>(null);
  const [targetValue, setTargetValue] = useState('');
  const [localTargets, setLocalTargets] = useState<Record<string, string>>({});
  const [showPaywall, setShowPaywall] = useState(false);

  const goodCount = cell.kpis.filter((k) => k.status === 'good').length;
  const warnCount = cell.kpis.filter((k) => k.status === 'warn').length;
  const badCount = cell.kpis.filter((k) => k.status === 'bad').length;
  const healthScore = cell.kpis.length > 0 ? Math.round((goodCount * 100 + warnCount * 50) / cell.kpis.length) : 0;

  // Generate value-based synthetic sparkline bars (deterministic from KPI value + target)
  const generateSparkline = useMemo(() => {
    return (kpiName: string, value: string | number, target: string | number) => {
      const numVal = Number(value) || 50;
      const numTarget = Number(target) || 100;
      const ratio = Math.min(1.5, numVal / numTarget);
      const bars: number[] = [];
      // Use name for seed offset so different KPIs get different shapes
      let seed = 0;
      for (let i = 0; i < kpiName.length; i++) seed = ((seed << 5) - seed) + kpiName.charCodeAt(i);
      for (let i = 0; i < 14; i++) {
        // Trend pattern: recent 3 bars trend toward current value ratio
        const isRecent = i >= 11;
        const baseHeight = isRecent ? ratio : 0.3 + (seed % 7) * 0.1;
        const variation = ((seed * (i + 1) * 31) % 100) / 500;
        bars.push(Math.max(10, Math.min(95, (baseHeight + variation) * 100)));
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      }
      return bars;
    };
  }, []);

  const toggleExpand = (name: string) => {
    setExpandedKpi(expandedKpi === name ? null : name);
  };

  const advancedAllowed = hasFeature('advancedAnalytics');

  // If advanced analytics not allowed, show limited view with upgrade CTA
  if (!advancedAllowed) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <BarChart3 size={16} className="text-primary-2" />
          <span className="text-sm font-bold">KPI 仪表盘</span>
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[9px] text-text-3">基础版</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">
          {/* Show basic health score only */}
          <div className="rounded-xl border border-border bg-surface p-3 md:p-4 text-center">
            <div className="text-3xl font-extrabold text-text">{healthScore}</div>
            <div className="text-[9px] text-text-3 mt-0.5">健康分</div>
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 md:p-6 text-center">
            <Lock size={24} className="mx-auto mb-2 text-primary-2" />
            <div className="text-sm font-semibold text-text mb-1">高级KPI分析</div>
            <p className="text-xs text-text-3 mb-3">解锁目标趋势预测、偏差预警、自定义KPI看板等高级功能</p>
            <button className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:opacity-80" onClick={() => setShowPaywall(true)}>
              升级专业版
            </button>
          </div>
        </div>
        <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} reason="高级KPI分析需要专业版或企业版" feature="advanced_analytics" />
      </div>
    );
  }

  const handleEditTarget = (name: string, currentTarget: string) => {
    setEditingTarget(name);
    setTargetValue(currentTarget);
  };

  const saveTarget = () => {
    if (editingTarget && targetValue.trim()) {
      setLocalTargets((prev) => ({ ...prev, [editingTarget]: targetValue.trim() }));
    }
    setEditingTarget(null);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <BarChart3 size={16} className="text-primary-2" />
        <span className="text-sm font-bold">KPI 仪表盘</span>
        <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ backgroundColor: indColor + '20', color: indColor }}>{industry} · {dept}</span>
      </div>

      {/* Health Score */}
      <div className="mx-4 mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="col-span-1 rounded-xl border border-border bg-surface p-3 md:p-4 flex flex-col items-center justify-center">
          <div className="text-3xl font-extrabold text-text">{healthScore}</div>
          <div className="text-[9px] text-text-3 mt-0.5">健康分</div>
          <div className="mt-2 h-2 w-full rounded-full bg-surface-2 overflow-hidden">
            <div className={cn('h-full rounded-full transition-all', healthScore >= 80 ? 'bg-success' : healthScore >= 60 ? 'bg-warn' : 'bg-danger')} style={{ width: `${healthScore}%` }} />
          </div>
        </div>
        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-surface p-3 text-center">
            <div className="text-2xl font-extrabold text-success">{goodCount}</div>
            <div className="text-[9px] text-text-3">达标</div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-3 text-center">
            <div className="text-2xl font-extrabold text-warn">{warnCount}</div>
            <div className="text-[9px] text-text-3">预警</div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-3 text-center">
            <div className="text-2xl font-extrabold text-danger">{badCount}</div>
            <div className="text-[9px] text-text-3">异常</div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">
        {cell.kpis.map((kpi) => {
          const displayTarget = localTargets[kpi.name] ?? kpi.target;
          const TrendIcon = TREND_ICON[kpi.trend];
          const progress = displayTarget > 0 ? Math.min(100, Math.round((Number(kpi.value) / Number(displayTarget)) * 100)) : 0;
          const isExpanded = expandedKpi === kpi.name;
          const sparkBars = generateSparkline(kpi.name, kpi.value, displayTarget);
          const gap = Number(kpi.value) - Number(displayTarget);
          const gapPct = displayTarget > 0 ? Math.round((gap / Number(displayTarget)) * 100) : 0;

          return (
            <div key={kpi.name} className="rounded-xl border border-border bg-surface">
              <div className="p-3 md:p-4 cursor-pointer" onClick={() => toggleExpand(kpi.name)}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-text">{kpi.name}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <TrendIcon size={16} className={kpi.status === 'good' ? 'text-success' : kpi.status === 'warn' ? 'text-warn' : 'text-danger'} />
                    <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold',
                      kpi.status === 'good' ? 'bg-success/10 text-success' : kpi.status === 'warn' ? 'bg-warn/10 text-warn' : 'bg-danger/10 text-danger'
                    )}>
                      {kpi.status === 'good' ? '达标' : kpi.status === 'warn' ? '预警' : '异常'}
                    </span>
                    {isExpanded ? <ChevronUp size={12} className="text-text-3" /> : <ChevronDown size={12} className="text-text-3" />}
                  </div>
                </div>
                <div className="flex flex-wrap items-end gap-4 mb-3">
                  <div className={cn('text-3xl font-extrabold', kpi.status === 'good' ? 'text-success' : kpi.status === 'warn' ? 'text-warn' : 'text-danger')}>
                    {kpi.value}
                  </div>
                  <div className="text-xs text-text-3 pb-1">目标 {displayTarget}</div>
                  {gap !== 0 && (
                    <div className={cn('text-[11px] font-semibold pb-1', gap > 0 ? 'text-success' : 'text-danger')}>
                      {gap > 0 ? '+' : ''}{gapPct}%
                    </div>
                  )}
                </div>
                <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                  <div className={cn('h-full rounded-full transition-all',
                    kpi.status === 'good' ? 'bg-success' : kpi.status === 'warn' ? 'bg-warn' : 'bg-danger'
                  )} style={{ width: `${progress}%` }} />
                </div>
                {/* Value-based sparkline */}
                <div className="mt-3 flex items-end gap-[3px] h-10">
                  {sparkBars.map((h, i) => (
                    <div key={i} className={cn('flex-1 rounded-t transition-all',
                      i >= 11 ? (kpi.status === 'good' ? 'bg-success/40' : kpi.status === 'warn' ? 'bg-warn/40' : 'bg-danger/40') : 'bg-surface-2'
                    )} style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>

              {/* Expanded detail panel */}
              {isExpanded && (
                <div className="border-t border-border px-4 py-3 space-y-3">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-lg bg-surface-2 p-2">
                      <div className="text-lg font-extrabold text-text">{kpi.value}</div>
                      <div className="text-[9px] text-text-3">当前值</div>
                    </div>
                    <div className="rounded-lg bg-surface-2 p-2">
                       <div className="text-lg font-extrabold text-text">{displayTarget}</div>
                       <div className="text-[9px] text-text-3">目标值</div>
                     </div>
                    <div className="rounded-lg bg-surface-2 p-2">
                      <div className={cn('text-lg font-extrabold', progress >= 100 ? 'text-success' : progress >= 70 ? 'text-warn' : 'text-danger')}>{progress}%</div>
                      <div className="text-[9px] text-text-3">完成率</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Target size={12} className="text-text-3" />
                    {editingTarget === kpi.name ? (
                      <div className="flex flex-wrap items-center gap-2 flex-1">
                        <input className="rounded-lg border border-primary/50 bg-surface-2 px-2 py-1 text-sm text-text outline-none w-24" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveTarget(); if (e.key === 'Escape') setEditingTarget(null); }} />
                        <button onClick={saveTarget} className="rounded-lg bg-success/10 p-1"><Check size={12} className="text-success" /></button>
                        <button onClick={() => setEditingTarget(null)} className="rounded-lg bg-danger/10 p-1"><X size={12} className="text-danger" /></button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2 flex-1">
                        <span className="text-xs text-text-2">目标: {displayTarget}</span>
                        <button onClick={(e) => { e.stopPropagation(); handleEditTarget(kpi.name, String(displayTarget)); }} className="rounded-lg bg-surface-2 p-1 hover:bg-surface-2/80">
                          <Edit3 size={10} className="text-text-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] text-text-3">
                    趋势: {kpi.trend === 'up' ? '上升' : kpi.trend === 'down' ? '下降' : '持平'} | 状态: {kpi.status === 'good' ? '达标' : kpi.status === 'warn' ? '预警' : '异常'}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
