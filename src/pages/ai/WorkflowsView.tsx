import { useState } from 'react';
import { useWorkflows, useMatrixCell } from '@/hooks/useMatrix';
import { cn } from '@/lib/utils';
import { Workflow, Play, Copy, Edit3, Star, Clock, Loader2 } from 'lucide-react';

export default function WorkflowsView() {
  const { workflows, loading } = useWorkflows();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const resolvedId = selectedId ?? workflows[0]?.id ?? '';
  const selected = workflows.find((w) => w.id === resolvedId);
  const { cell } = useMatrixCell();

  if (loading || !selected) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-2" />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Template List */}
      <div className="flex w-64 shrink-0 flex-col border-r border-border bg-surface overflow-y-auto">
        <div className="border-b border-border px-3 py-2.5">
          <span className="text-xs font-bold">工作流模板</span>
          <span className="ml-2 text-[9px] text-text-3">{workflows.length} 个</span>
        </div>
        <div className="py-1">
          {workflows.map((wf) => (
            <button key={wf.id} onClick={() => setSelectedId(wf.id)}
              className={cn('flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors',
                resolvedId === wf.id ? 'bg-primary/10 font-semibold text-primary-2' : 'text-text-2 hover:bg-surface-2'
              )}
            >
              <Workflow size={13} className="shrink-0 text-text-3" />
              <div className="min-w-0">
                <div className="truncate">{wf.name}</div>
                <div className="text-[9px] text-text-3 flex items-center gap-2"><Star size={8} />{wf.usage_count}次使用</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail */}
      <div className="flex flex-1 flex-col min-w-0 overflow-y-auto">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <span className="text-sm font-bold">{selected.name}</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary-2">{selected.category}</span>
          {selected.is_built_in && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[9px] text-text-3">内置</span>}
          <div className="ml-auto flex gap-2">
            <button className="flex items-center gap-1 rounded-lg bg-surface-2 px-3 py-1.5 text-[10px] text-text-3 hover:text-text"><Copy size={10} />复制</button>
            <button className="flex items-center gap-1 rounded-lg bg-surface-2 px-3 py-1.5 text-[10px] text-text-3 hover:text-text"><Edit3 size={10} />编辑</button>
            <button className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-[10px] font-semibold text-white hover:opacity-80"><Play size={10} />启动</button>
          </div>
        </div>

        <div className="p-4 space-y-4 max-w-2xl">
          {/* Steps visualization */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-text-3 mb-3">流程步骤</div>
            <div className="space-y-2">
              {selected.steps.map((step, i) => {
                const isCurrent = cell.workflow[i] === step && i === cell.wfCurrent;
                const isDone = i < cell.wfCurrent;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className={cn('flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shrink-0',
                      isCurrent ? 'bg-primary text-white' : isDone ? 'bg-success/20 text-success' : 'bg-surface-2 text-text-3'
                    )}>{i + 1}</div>
                    <span className={cn('text-xs', isCurrent ? 'font-semibold text-text' : isDone ? 'text-success' : 'text-text-3')}>{step}</span>
                    {isCurrent && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[8px] font-bold text-primary-2">当前</span>}
                    {isDone && <span className="rounded-full bg-success/10 px-2 py-0.5 text-[8px] font-bold text-success">已完成</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-surface p-3">
              <div className="text-[9px] text-text-3 mb-1">使用次数</div>
              <div className="text-lg font-extrabold text-text flex items-center gap-2"><Clock size={14} className="text-text-3" />{selected.usage_count}</div>
            </div>
            <div className="rounded-xl border border-border bg-surface p-3">
              <div className="text-[9px] text-text-3 mb-1">步骤数</div>
              <div className="text-lg font-extrabold text-text">{selected.steps.length}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
