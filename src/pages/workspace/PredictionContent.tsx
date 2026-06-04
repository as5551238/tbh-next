import { useMatrixCell, useIndustryColor } from '@/hooks/useMatrix';
import { Brain, TrendingUp, AlertTriangle, Sparkles, ArrowUpRight } from 'lucide-react';

export default function PredictionContent() {
  const cell = useMatrixCell();
  const indColor = useIndustryColor();

  const predictions = [
    {
      title: 'Q3 路线图延期风险',
      probability: 72,
      impact: 'high',
      trend: 'up',
      reason: '当前进度仅75%，关键路径上3个任务资源不足',
      suggestion: '建议将导出优化任务拆分为两期，优先交付核心格式',
    },
    {
      title: 'PRD标准化目标提前完成',
      probability: 85,
      impact: 'positive',
      trend: 'up',
      reason: '团队采纳率已达78%，模板v2.0获一致好评',
      suggestion: '可将节省资源投入Q4标准化扩展',
    },
    {
      title: '导出功能使用率下降',
      probability: 45,
      impact: 'medium',
      trend: 'flat',
      reason: '近2周数据波动，可能与竞品更新有关',
      suggestion: '建议本周进行用户访谈确认原因',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Brain size={18} style={{ color: indColor }} />
        <span className="text-sm font-bold">预测引擎</span>
        <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ backgroundColor: indColor + '20', color: indColor }}>AI驱动</span>
        <span className="ml-auto text-[10px] text-text-3">基于 {cell.kpis.length} 个指标 · 每日更新</span>
      </div>

      {/* Confidence Score */}
      <div className="rounded-xl border border-border p-4 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${indColor}08 0%, ${indColor}02 100%)` }}>
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-10" style={{ backgroundColor: indColor }} />
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex flex-col items-center">
            <div className="relative h-16 w-16">
              <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2" className="text-surface-2" />
                <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="2" strokeLinecap="round" strokeDasharray={`${78} ${100 - 78}`} className="text-accent" style={{ stroke: indColor }} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-lg font-extrabold">78</span>
            </div>
            <span className="text-[9px] text-text-3 mt-1">预测置信度</span>
          </div>
          <div className="flex-1">
            <div className="text-xs font-semibold text-text mb-1">综合预测概览</div>
            <p className="text-[11px] text-text-2 leading-relaxed">
              本周整体风险可控，Q3路线图存在延期可能，但PRD标准化将提前完成。建议关注导出功能使用率波动。
            </p>
          </div>
        </div>
      </div>

      {/* Prediction Cards */}
      <div className="space-y-3">
        {predictions.map((p) => (
          <div key={p.title} className="rounded-xl border border-border bg-surface p-4 transition-all hover:border-border-2 hover:shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-text">{p.title}</span>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                  p.impact === 'positive' ? 'bg-success/10 text-success' :
                  p.impact === 'high' ? 'bg-danger/10 text-danger' :
                  'bg-warn/10 text-warn'
                }`}>
                  {p.impact === 'positive' ? '利好' : p.impact === 'high' ? '高风险' : '中风险'}
                </span>
                {p.trend === 'up' && <ArrowUpRight size={12} className={p.impact === 'positive' ? 'text-success' : 'text-danger'} />}
              </div>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${p.probability}%`,
                    backgroundColor: p.impact === 'positive' ? '#22c984' : p.probability > 60 ? '#ff5c6a' : '#ffc44d',
                  }}
                />
              </div>
              <span className="text-xs font-bold" style={{ color: p.impact === 'positive' ? '#22c984' : p.probability > 60 ? '#ff5c6a' : '#ffc44d' }}>
                {p.probability}%
              </span>
            </div>
            <div className="rounded-lg bg-surface-2/50 p-2.5 mb-2">
              <div className="text-[10px] font-semibold text-text-3 mb-1">原因分析</div>
              <p className="text-[11px] text-text-2">{p.reason}</p>
            </div>
            <div className="flex items-start gap-1.5">
              <Sparkles size={12} className="text-accent shrink-0 mt-0.5" style={{ color: indColor }} />
              <p className="text-[11px] text-text-2">{p.suggestion}</p>
            </div>
          </div>
        ))}
      </div>

      {/* AI Insight */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
        <div className="flex items-center gap-2 text-xs text-primary-2">
          <Brain size={14} />
          <span className="font-semibold">预测引擎说明</span>
        </div>
        <p className="mt-1 text-[11px] text-text-2 leading-relaxed">
          预测基于历史数据趋势、资源分配状态和行业基准综合计算。置信度越高，预测越可靠。建议重点关注概率 &gt; 60% 的风险项。
        </p>
      </div>
    </div>
  );
}
