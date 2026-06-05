import { useMatrixCell, useIndustryColor } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, BarChart3, Target, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus };

export default function KpiDashView() {
  const indColor = useIndustryColor();
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);
  const { cell, loading } = useMatrixCell();

  const goodCount = cell.kpis.filter((k) => k.status === 'good').length;
  const warnCount = cell.kpis.filter((k) => k.status === 'warn').length;
  const badCount = cell.kpis.filter((k) => k.status === 'bad').length;
  const healthScore = Math.round((goodCount * 100 + warnCount * 50) / cell.kpis.length);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <BarChart3 size={16} className="text-primary-2" />
        <span className="text-sm font-bold">KPI 仪表盘</span>
        <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ backgroundColor: indColor + '20', color: indColor }}>{industry} · {dept}</span>
      </div>

      {/* Health Score */}
      <div className="mx-4 mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="col-span-1 rounded-xl border border-border bg-surface p-4 flex flex-col items-center justify-center">
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
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cell.kpis.map((kpi) => {
          const TrendIcon = TREND_ICON[kpi.trend];
          const progress = kpi.status === 'good' ? 90 : kpi.status === 'warn' ? 60 : 30;
          return (
            <div key={kpi.name} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-text">{kpi.name}</span>
                <div className="flex items-center gap-2">
                  <TrendIcon size={16} className={kpi.status === 'good' ? 'text-success' : kpi.status === 'warn' ? 'text-warn' : 'text-danger'} />
                  <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold',
                    kpi.status === 'good' ? 'bg-success/10 text-success' : kpi.status === 'warn' ? 'bg-warn/10 text-warn' : 'bg-danger/10 text-danger'
                  )}>
                    {kpi.status === 'good' ? '达标' : kpi.status === 'warn' ? '预警' : '异常'}
                  </span>
                </div>
              </div>
              <div className="flex items-end gap-4 mb-3">
                <div className={cn('text-3xl font-extrabold', kpi.status === 'good' ? 'text-success' : kpi.status === 'warn' ? 'text-warn' : 'text-danger')}>
                  {kpi.value}
                </div>
                <div className="text-xs text-text-3 pb-1">目标 {kpi.target}</div>
              </div>
              <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                <div className={cn('h-full rounded-full transition-all',
                  kpi.status === 'good' ? 'bg-success' : kpi.status === 'warn' ? 'bg-warn' : 'bg-danger'
                )} style={{ width: `${progress}%` }} />
              </div>
              {/* Sparkline placeholder */}
              <div className="mt-3 flex items-end gap-[3px] h-10">
                {Array.from({ length: 14 }).map((_, i) => {
                  const h = 20 + ((i * 37 + 13) % 80);
                  return <div key={i} className={cn('flex-1 rounded-t', i >= 11 ? 'bg-primary/30' : 'bg-surface-2')} style={{ height: `${h}%` }} />;
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
