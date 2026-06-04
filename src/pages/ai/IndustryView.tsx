import { useMatrixCell, useIndustryColor } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, Factory, BarChart3, Users, Target } from 'lucide-react';

const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus };

const INDUSTRY_PERSPECTIVES: Record<string, { focus: string; trends: string[]; benchmarks: string[] }> = {
  'IT业': {
    focus: '需求交付效率与产品市场匹配',
    trends: ['AI原生功能成为标配', '低代码平台渗透加速', 'SaaS向PaaS演进'],
    benchmarks: ['需求交付周期 ≤15天', 'PRD通过率 ≥80%', 'NPS ≥45', 'Sprint完成率 ≥85%'],
  },
  '制造业': { focus: '生产良率与供应链韧性', trends: ['数字孪生落地', '绿色制造合规', '柔性生产升级'], benchmarks: ['生产良率 ≥98%', '交付准时率 ≥95%', '库存周转 ≤30天'] },
  '教育业': { focus: '教学效果与学生留存', trends: ['个性化学习路径', 'AI辅导助手', '混合式教学深化'], benchmarks: ['课程完成率 ≥70%', '学生满意度 ≥4.2/5', '续费率 ≥60%'] },
  '金融业': { focus: '风控合规与客户资产增长', trends: ['监管科技(RegTech)升级', '嵌入式金融', 'ESG投资主流化'], benchmarks: ['风控准确率 ≥99.5%', '客户资产增长率 ≥8%', '合规事件 =0'] },
};

export default function IndustryView() {
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);
  const indColor = useIndustryColor();
  const cell = useMatrixCell();
  const perspective = INDUSTRY_PERSPECTIVES[industry] ?? INDUSTRY_PERSPECTIVES['IT业'];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Factory size={16} className="text-primary-2" />
        <span className="text-sm font-bold">行业视图</span>
        <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ backgroundColor: indColor + '20', color: indColor }}>{industry}</span>
        <span className="text-[10px] text-text-3">{dept}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Focus */}
        <div className="rounded-xl border border-border p-4 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${indColor}08 0%, ${indColor}03 100%)` }}>
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-10" style={{ backgroundColor: indColor }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1"><Target size={14} style={{ color: indColor }} /><span className="text-xs font-bold">核心关注</span></div>
            <p className="text-sm text-text-2">{perspective.focus}</p>
          </div>
        </div>

        {/* KPIs */}
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-3">当前KPI</div>
          <div className="grid grid-cols-2 gap-2">
            {cell.kpis.map((kpi) => {
              const TrendIcon = TREND_ICON[kpi.trend];
              return (
                <div key={kpi.name} className="rounded-xl border border-border bg-surface p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-text-3">{kpi.name}</span>
                    <TrendIcon size={12} className={kpi.status === 'good' ? 'text-success' : kpi.status === 'warn' ? 'text-warn' : 'text-danger'} />
                  </div>
                  <div className={cn('text-lg font-extrabold', kpi.status === 'good' ? 'text-success' : kpi.status === 'warn' ? 'text-warn' : 'text-danger')}>{kpi.value}</div>
                  <div className="text-[9px] text-text-3">目标 {kpi.target}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trends */}
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-3">行业趋势</div>
          <div className="space-y-2">
            {perspective.trends.map((trend, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <TrendingUp size={14} className="text-primary-2" />
                </div>
                <span className="text-xs text-text">{trend}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Benchmarks */}
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-3">行业基准</div>
          <div className="flex flex-wrap gap-1.5">
            {perspective.benchmarks.map((bm, i) => (
              <span key={i} className="rounded-full bg-surface-2 px-3 py-1.5 text-[10px] text-text-2">{bm}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
