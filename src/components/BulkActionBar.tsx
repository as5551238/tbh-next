import { useState } from 'react';
import { Lock } from 'lucide-react';
import { hasFeature } from '@/lib/subscription';

interface Props {
  selectedCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBatchStatus: (status: string) => void;
  onBatchDelete: () => void;
  onBatchAssign: (assignee: string) => void;
}

export default function BulkActionBar({ selectedCount, onSelectAll, onDeselectAll, onBatchStatus, onBatchDelete, onBatchAssign }: Props) {
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignee, setAssignee] = useState('');

  if (selectedCount === 0) return null;

  const locked = !hasFeature('batchOperations');

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
      <div className="mx-auto max-w-3xl rounded-t-xl border border-b-0 border-border bg-surface px-4 py-3 shadow-2xl">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-text">
            已选 <span className="text-brand-accent">{selectedCount}</span> 项
          </span>

          <button onClick={onSelectAll} className="text-xs text-brand-accent hover:underline">全选</button>
          <button onClick={onDeselectAll} className="text-xs text-text-3 hover:text-text">取消</button>

          <div className="mx-2 h-4 w-px bg-border" />

          {locked ? (
            <div className="flex items-center gap-2">
              <Lock size={14} className="text-text-3" />
              <span className="text-[10px] text-text-3">批量操作需专业版</span>
              <a href="#/ai/subscription" className="text-[10px] text-brand-accent hover:underline">升级</a>
            </div>
          ) : (
            <>
              <button onClick={() => onBatchStatus('done')} className="rounded-md bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20 transition-colors">批量完成</button>
              <button onClick={onBatchDelete} className="rounded-md bg-danger/10 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/20 transition-colors">批量删除</button>
              <div className="relative">
                <button onClick={() => setAssignOpen(!assignOpen)} className="rounded-md bg-brand-accent/10 px-3 py-1.5 text-xs font-medium text-brand-accent hover:bg-brand-accent/20 transition-colors">批量指派</button>
                {assignOpen && (
                  <div className="absolute bottom-full right-0 mb-2 flex gap-2 rounded-lg border border-border bg-surface p-2 shadow-xl">
                    <input type="text" placeholder="指派人" value={assignee} onChange={(e) => setAssignee(e.target.value)} className="h-7 w-28 rounded-md border border-border bg-bg px-2 text-xs text-text" />
                    <button onClick={() => { if (assignee.trim()) { onBatchAssign(assignee.trim()); setAssignee(''); setAssignOpen(false); } }} className="h-7 rounded-md bg-brand-accent px-3 text-xs font-bold text-white">确认</button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
