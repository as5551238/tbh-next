import { useMatrixCell, useIndustryColor } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, Lightbulb, ArrowUpRight, ArrowDownRight, BarChart3 } from 'lucide-react';

const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus };

export default function InsightContent() {
  const cell = useMatrixCell();
  const indColor = useIndustryColor();
  const industry = useAppStore((s) => s.industry);

  const insights = [
    { title: '需求交付周期趋势', desc: '近4周维持在13-14天，稳定在目标范围内', impact: 'positive', kpi: '需求交付周期' },
    { title: '功能使用率异常', desc: '导出功能使用率从25%骤降至12%，与上次UI改版时间吻合', impact: 'negative', kpi: '功能使用率' },
    { title: 'PRD评审效率提升', desc: '引入标准化模板后，PRD一次性通过率从65%提升至82%', impact: 'positive', kpi: 'PRD通过率' },
    { title: 'NPS下降预警', desc: '连续2周低于目标线，主要集中在Onboarding环节', impact: 'negative', kpi: 'NPS' },
  ];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Lightbulb size={16} className="text-primary-2" />
        <span className="text-sm font-bold">数据洞察</span>
        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[9px] font-bold text-accent">AI分析</span>
      </div>

      {/* AI Summary */}
      <div className="mx-4 mt-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary-2 mb-1"><Lightbulb size={14} />AI 洞察摘要</div>
        <p className="text-[11px] text-text-2 leading-relaxed">
          本周最关键发现：导出功能使用率骤降与3周前UI改版高度相关，建议回滚导航入口或优化引导流程。
          PRD模板标准化效果显著，建议推广至其他文档类型。
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {insights.map((insight, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-4 transition-all hover:shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg shrink-0',
                insight.impact === 'positive' ? 'bg-success/10' : 'bg-danger/10'
              )}>
                {insight.impact === 'positive' ? <ArrowUpRight size={14} className="text-success" /> : <ArrowDownRight size={14} className="text-danger" />}
              </div>
              <span className="text-sm font-semibold text-text">{insight.title}</span>
              <span className={cn('ml-auto rounded-full px-2 py-0.5 text-[8px] font-bold',
                insight.impact === 'positive' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
              )}>
                {insight.impact === 'positive' ? '正向' : '需关注'}
              </span>
            </div>
            <p className="text-xs text-text-2 leading-relaxed mb-2">{insight.desc}</p>
            <div className="text-[9px] text-text-3">关联指标: {insight.kpi}</div>
          </div>
        ))}

        {/* KPI Summary */}
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-text-3 mb-3">指标趋势总览</div>
          <div className="grid grid-cols-2 gap-2">
            {cell.kpis.map((kpi) => {
              const TI = TREND_ICON[kpi.trend];
              return (
                <div key={kpi.name} className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
                  <TI size={13} className={kpi.status === 'good' ? 'text-success' : kpi.status === 'warn' ? 'text-warn' : 'text-danger'} />
                  <div className="min-w-0">
                    <div className="text-[10px] text-text-3 truncate">{kpi.name}</div>
                    <div className={cn('text-xs font-bold', kpi.status === 'good' ? 'text-success' : kpi.status === 'warn' ? 'text-warn' : 'text-danger')}>{kpi.value}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
