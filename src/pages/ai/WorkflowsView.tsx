import { useState } from 'react';
import { useWorkflows, useMatrixCell } from '@/hooks/useMatrix';
import { cn } from '@/lib/utils';
import { Workflow, Play, Copy, Edit3, Star, Clock, Loader2, Check } from 'lucide-react';

export default function WorkflowsView() {
  const { workflows, setWorkflows, loading } = useWorkflows();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [toast, setToast] = useState('');
  const resolvedId = selectedId ?? workflows[0]?.id ?? '';
  const selected = workflows.find((w) => w.id === resolvedId);
  const { cell } = useMatrixCell();

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  function handleCopy() {
    if (!selected) return;
    const copy = {
      ...selected,
      id: `wf-${Date.now()}`,
      name: `${selected.name} (副本)`,
      is_built_in: false,
      usage_count: 0,
    };
    setWorkflows((prev) => [...prev, copy]);
    setSelectedId(copy.id);
    showToast(`已复制"${selected.name}"`);
  }

  function handleStart() {
    if (!selected) return;
    setWorkflows((prev) => prev.map((w) => w.id === selected.id ? { ...w, usage_count: w.usage_count + 1 } : w));
    showToast(`工作流"${selected.name}"已启动`);
  }

  function handleEdit() {
    if (!selected || selected.is_built_in) return;
    setEditingName(selected.id);
    setEditValue(selected.name);
  }

  function handleSaveEdit() {
    if (!editingName || !editValue.trim()) {
      setEditingName(null);
      return;
    }
    setWorkflows((prev) => prev.map((w) => w.id === editingName ? { ...w, name: editValue.trim() } : w));
    setEditingName(null);
  }

  if (loading || !selected) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-2" />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-success/90 px-4 py-2 text-xs font-semibold text-white shadow-lg">
          <Check size={12} className="mr-1.5 inline" />{toast}
        </div>
      )}
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
          {editingName === selected.id ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="rounded-lg border border-primary/50 bg-surface-2 px-2 py-1 text-sm text-text outline-none"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingName(null); }}
              />
              <button onClick={handleSaveEdit} className="rounded-lg bg-success/10 px-2 py-1 text-[10px] text-success hover:bg-success/20"><Check size={12} /></button>
            </div>
          ) : (
            <span className="text-sm font-bold">{selected.name}</span>
          )}
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary-2">{selected.category}</span>
          {selected.is_built_in && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[9px] text-text-3">内置</span>}
          <div className="ml-auto flex gap-2">
            <button onClick={handleCopy} className="flex items-center gap-1 rounded-lg bg-surface-2 px-3 py-1.5 text-[10px] text-text-3 hover:text-text"><Copy size={10} />复制</button>
            <button onClick={handleEdit} disabled={selected.is_built_in} className="flex items-center gap-1 rounded-lg bg-surface-2 px-3 py-1.5 text-[10px] text-text-3 hover:text-text disabled:opacity-40" title={selected.is_built_in ? '内置模板不可编辑' : '编辑'}><Edit3 size={10} />编辑</button>
            <button onClick={handleStart} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-[10px] font-semibold text-white hover:opacity-80"><Play size={10} />启动</button>
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
