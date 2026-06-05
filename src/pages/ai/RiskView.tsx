import { useRisks, useMatrixCell } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { AlertTriangle, Clock, TrendingDown, Shield, Loader2 } from 'lucide-react';

const LEVEL_STYLES: Record<string, string> = {
  critical: 'bg-danger/10 text-danger border-l-danger',
  high: 'bg-warn/10 text-warn border-l-warn',
  medium: 'bg-primary/10 text-primary-2 border-l-primary',
  low: 'bg-surface-2 text-text-3 border-l-border',
};

const LEVEL_DOT: Record<string, string> = { critical: 'bg-danger', high: 'bg-warn', medium: 'bg-primary-2', low: 'bg-text-3' };

export default function RiskView() {
  const { risks, loading } = useRisks();
  const { cell } = useMatrixCell();
  const industry = useAppStore((s) => s.industry);

  const activeRisks = risks.filter((r) => r.status !== 'resolved');
  const criticalCount = risks.filter((r) => r.level === 'critical' && r.status === 'active').length;

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-2" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Shield size={16} className="text-primary-2" />
        <span className="text-sm font-bold">风险预警</span>
        {criticalCount > 0 && <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-bold text-danger">{criticalCount} 紧急</span>}
        <span className="text-[10px] text-text-3">{activeRisks.length} 活跃风险</span>
      </div>

      {/* AI Summary */}
      <div className="mx-4 mt-3 rounded-xl border border-warn/20 bg-warn/5 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-warn mb-1">
          <AlertTriangle size={14} />AI 风险摘要
        </div>
        <p className="text-[11px] text-text-2 leading-relaxed">
          当前最需关注：「Q3路线图评审」截止在即，建议立即确认剩余3个需求。
          「导出功能」使用率持续走低，建议本周安排专项优化。
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {risks.map((risk) => (
          <div key={risk.id} className={cn('rounded-xl border border-border border-l-2 bg-surface p-4 transition-all hover:shadow-lg', LEVEL_STYLES[risk.level].split(' ').pop(),
            risk.status === 'resolved' && 'opacity-40'
          )}>
            <div className="flex items-center gap-2 mb-1.5">
              <div className={cn('h-2 w-2 rounded-full shrink-0', LEVEL_DOT[risk.level])} />
              <span className="text-sm font-semibold text-text">{risk.title}</span>
              <span className={cn('ml-auto rounded-full px-2 py-0.5 text-[8px] font-bold shrink-0', LEVEL_STYLES[risk.level].split(' ').slice(0, 2).join(' '))}>
                {risk.level === 'critical' ? '紧急' : risk.level === 'high' ? '高' : risk.level === 'medium' ? '中' : '低'}
              </span>
            </div>
            <p className="text-xs text-text-2 mb-2 leading-relaxed">{risk.description}</p>
            <div className="flex flex-wrap items-center gap-3 text-[10px] text-text-3">
              <span>来源: {risk.source}</span>
              <span className="flex items-center gap-1"><Clock size={9} />{risk.detected_at}</span>
              {risk.affected_kpi && <span className="flex items-center gap-1"><TrendingDown size={9} />影响: {risk.affected_kpi}</span>}
              <span className={cn('ml-auto', risk.status === 'active' ? 'text-danger' : risk.status === 'watching' ? 'text-warn' : 'text-success')}>
                {risk.status === 'active' ? '活跃' : risk.status === 'watching' ? '观察中' : '已解决'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
