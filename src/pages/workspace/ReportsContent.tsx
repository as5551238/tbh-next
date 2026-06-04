import { useMatrixCell } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { BarChart3, Download, Calendar, Filter, TrendingUp, TrendingDown } from 'lucide-react';

interface Report {
  id: string;
  name: string;
  type: 'weekly' | 'monthly' | 'custom';
  generatedAt: string;
  generatedBy: string;
  status: 'ready' | 'generating';
  size: string;
}

const MOCK_REPORTS: Report[] = [
  { id: 'R-001', name: '周报 - 产品部W23', type: 'weekly', generatedAt: '6月2日', generatedBy: 'AI产品分析师', status: 'ready', size: '2.1 MB' },
  { id: 'R-002', name: '月度OKR进展报告', type: 'monthly', generatedAt: '6月1日', generatedBy: '系统', status: 'ready', size: '4.5 MB' },
  { id: 'R-003', name: '竞品功能对比分析', type: 'custom', generatedAt: '5月30日', generatedBy: 'AI竞品侦探', status: 'ready', size: '1.8 MB' },
  { id: 'R-004', name: '用户行为分析报告', type: 'custom', generatedAt: '5月28日', generatedBy: 'AI数据看门人', status: 'ready', size: '3.2 MB' },
  { id: 'R-005', name: '周报 - 产品部W24', type: 'weekly', generatedAt: '生成中...', generatedBy: 'AI产品分析师', status: 'generating', size: '-' },
];

const TYPE_STYLES: Record<string, string> = { weekly: 'bg-primary/10 text-primary-2', monthly: 'bg-accent/10 text-accent', custom: 'bg-success/10 text-success' };

export default function ReportsContent() {
  const cell = useMatrixCell();
  const industry = useAppStore((s) => s.industry);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <BarChart3 size={16} className="text-primary-2" />
        <span className="text-sm font-bold">报表中心</span>
        <button className="ml-auto rounded-lg bg-primary px-3 py-1 text-[11px] font-semibold text-white hover:opacity-80">+ 生成报表</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {MOCK_REPORTS.map((report) => (
          <div key={report.id} className={cn('group rounded-xl border border-border bg-surface p-4 transition-all hover:shadow-lg',
            report.status === 'generating' && 'animate-pulse'
          )}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <BarChart3 size={16} className="text-primary-2" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-text">{report.name}</span>
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[8px] font-bold', TYPE_STYLES[report.type])}>
                    {report.type === 'weekly' ? '周报' : report.type === 'monthly' ? '月报' : '自定义'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-text-3">
                  <span>{report.generatedBy}</span>
                  <span>{report.generatedAt}</span>
                  <span>{report.size}</span>
                </div>
              </div>
              {report.status === 'ready' && (
                <button className="flex items-center gap-1 rounded-lg bg-surface-2 px-2.5 py-1.5 text-[10px] text-text-3 opacity-0 group-hover:opacity-100 transition-all hover:text-text">
                  <Download size={10} />导出
                </button>
              )}
              {report.status === 'generating' && (
                <span className="rounded-full bg-warn/10 px-2 py-0.5 text-[9px] font-bold text-warn">生成中...</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
