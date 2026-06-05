import { useState } from 'react';
import { useMatrixCell, useApprovals } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, AlertTriangle, ChevronRight, User, Loader2 } from 'lucide-react';



const TYPE_LABELS: Record<string, string> = { leave: '请假', expense: '报销', purchase: '采购', access: '权限', project: '项目' };
const URGENCY_STYLES: Record<string, string> = { urgent: 'bg-danger/10 text-danger', normal: 'bg-warn/10 text-warn', low: 'bg-surface-2 text-text-3' };
const STATUS_STYLES: Record<string, string> = { pending: 'bg-warn/10 text-warn', approved: 'bg-success/10 text-success', rejected: 'bg-danger/10 text-danger' };
const STATUS_LABELS: Record<string, string> = { pending: '待审批', approved: '已通过', rejected: '已驳回' };

export default function ApprovalsView() {
  const { cell, loading: cellLoading } = useMatrixCell();
  const { approvals, setApprovals, loading } = useApprovals();
  const industry = useAppStore((s) => s.industry);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const filtered = filter === 'all' ? approvals : approvals.filter((a) => a.status === filter);
  const pendingCount = approvals.filter((a) => a.status === 'pending').length;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="text-sm font-bold">审批中心</span>
        {pendingCount > 0 && (
          <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-bold text-danger">{pendingCount} 待审批</span>
        )}
        <div className="ml-auto flex gap-1">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn('rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-colors',
                filter === f ? 'bg-primary/10 text-primary-2' : 'text-text-3 hover:bg-surface-2'
              )}
            >
              {f === 'all' ? '全部' : STATUS_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {/* AI Alert */}
      <div className="mx-4 mt-3 rounded-xl border border-warn/20 bg-warn/5 px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs text-warn">
          <AlertTriangle size={14} />
          <span className="font-semibold">AI 提醒</span>
        </div>
        <p className="mt-1 text-[11px] text-text-2">
          「Q3路线图预算申请」已等待2小时，涉及紧急项目资源，建议尽快审批。
        </p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-text-3" size={24} /></div>
        ) : (
        filtered.map((item) => (
          <div key={item.id} className={cn('group rounded-xl border border-border bg-surface p-4 transition-all hover:border-border-2 hover:shadow-lg',
            item.status === 'pending' && 'border-l-2 border-l-warn'
          )}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-text">{item.title}</span>
                <span className={cn('rounded-full px-1.5 py-0.5 text-[8px] font-bold', URGENCY_STYLES[item.urgency])}>
                  {item.urgency === 'urgent' ? '紧急' : item.urgency === 'normal' ? '普通' : '低'}
                </span>
              </div>
              <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold', STATUS_STYLES[item.status])}>
                {STATUS_LABELS[item.status]}
              </span>
            </div>
            <div className="flex items-center gap-4 text-[10px] text-text-3">
              <span className="flex items-center gap-1"><User size={10} />{item.requester} · {item.department}</span>
              <span>{TYPE_LABELS[item.type]}</span>
              {item.amount && <span>金额: {item.amount}</span>}
                <span className="flex items-center gap-1"><Clock size={10} />{item.created_at}</span>
            </div>
            {item.status === 'pending' && (
              <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="rounded-lg bg-success/10 px-3 py-1.5 text-[10px] font-semibold text-success hover:bg-success/20 transition-colors">通过</button>
                <button className="rounded-lg bg-danger/10 px-3 py-1.5 text-[10px] font-semibold text-danger hover:bg-danger/20 transition-colors">驳回</button>
                <button className="rounded-lg bg-surface-2 px-3 py-1.5 text-[10px] font-semibold text-text-3 hover:text-text transition-colors">
                  详情 <ChevronRight size={10} className="inline" />
                </button>
              </div>
            )}
          </div>
        ))
        )}
      </div>
    </div>
  );
}
