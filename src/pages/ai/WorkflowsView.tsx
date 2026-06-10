import { useState, useEffect } from 'react';
import { useWorkflows, useWorkflowInstances, useMatrixCell } from '@/hooks/useMatrix';
import { useToast, ToastOverlay } from '@/hooks/useToast';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { Workflow, Play, StopCircle, Copy, Edit3, Star, Clock, Check, Trash2, Lock } from 'lucide-react';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { usePersistedState } from '@/hooks/usePersistedState';
import { hasFeature } from '@/lib/subscription';
import PaywallModal from '@/components/PaywallModal';
import { CardSkeleton } from '@/components/Skeleton';

export default function WorkflowsView() {
  const { workflows, setWorkflows, loading } = useWorkflows();
  const { instances, addInstance, editInstance, removeInstance } = useWorkflowInstances();
  const { toasts, success } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [runningIds, setRunningIds] = usePersistedState<Set<string>>('tbh-running-workflows', new Set<string>());
  function saveRunningIds(ids: Set<string>) { setRunningIds(ids); }
  const addModal = useModal();
  const [addForm, setAddForm] = useState({ name: '', category: '通用', steps: '' });
  const [showPaywall, setShowPaywall] = useState(false);
  const resolvedId = selectedId ?? workflows[0]?.id ?? '';
  const selected = workflows.find((w) => w.id === resolvedId);
  const { cell } = useMatrixCell();

  // Sync local workflows with DB instances on mount
  useEffect(() => {
    if (instances.length > 0 && workflows.length === 0) {
      const mapped = instances.map((inst) => ({
        id: inst.id,
        name: inst.name,
        category: inst.category,
        is_built_in: inst.is_built_in,
        usage_count: inst.usage_count,
        steps: Array.isArray(inst.steps) ? inst.steps : [],
      }));
      setWorkflows(mapped);
    }
  }, [instances]);

  function showToast(msg: string) {
    success(msg);
  }

  async function handleCopy() {
    if (!selected) return;
    const newSteps = [...selected.steps];
    const inst = await addInstance({
      workflow_id: `wf-copy-${Date.now()}`,
      name: `${selected.name} (副本)`,
      category: selected.category,
      is_built_in: false,
      usage_count: 0,
      steps: newSteps,
      current_step: 0,
      status: 'idle',
      team_id: 'default',
    });
    const copy = {
      ...selected,
      id: inst.id,
      name: `${selected.name} (副本)`,
      is_built_in: false,
      usage_count: 0,
    };
    setWorkflows((prev) => [...prev, copy]);
    setSelectedId(copy.id);
    showToast(`已复制"${selected.name}"`);
  }

  async function handleStart() {
    if (!selected) return;
    const newCount = selected.usage_count + 1;
    setWorkflows((prev) => prev.map((w) => w.id === selected.id ? { ...w, usage_count: newCount } : w));
    const newRunning = new Set(runningIds);
    newRunning.add(selected.id);
    saveRunningIds(newRunning);
    try {
      await editInstance(selected.id, { usage_count: newCount, status: 'running', current_step: 0, workflow_id: selected.id, name: selected.name } as Parameters<typeof editInstance>[1]);
    } catch (err) { console.warn("[workflows]", err); }
    showToast(`工作流"${selected.name}"已启动`);
  }

  async function handleStop() {
    if (!selected) return;
    const newRunning = new Set(runningIds);
    newRunning.delete(selected.id);
    saveRunningIds(newRunning);
    try {
      await editInstance(selected.id, { status: 'idle', workflow_id: selected.id, name: selected.name } as Parameters<typeof editInstance>[1]);
    } catch (err) { console.warn("[workflows]", err); }
    showToast(`工作流"${selected.name}"已停止`);
  }

  function handleEdit() {
    if (!selected || selected.is_built_in) return;
    setEditingName(selected.id);
    setEditValue(selected.name);
  }

  async function handleSaveEdit() {
    if (!editingName || !editValue.trim()) {
      setEditingName(null);
      return;
    }
    setWorkflows((prev) => prev.map((w) => w.id === editingName ? { ...w, name: editValue.trim() } : w));
    try {
      await editInstance(editingName, { name: editValue.trim(), workflow_id: selected?.id ?? editingName } as Parameters<typeof editInstance>[1]);
    } catch (err) { console.warn("[workflows]", err); }
    setEditingName(null);
  }

  async function handleDelete() {
    if (!selected || selected.is_built_in) return;
    const id = selected.id;
    setWorkflows((prev) => prev.filter((w) => w.id !== id));
    try {
      await removeInstance(id);
    } catch (err) { console.warn("[workflows]", err); }
    setSelectedId(null);
    showToast(`工作流已删除`);
  }

  async function handleAddSave() {
    if (!addForm.name.trim()) return;
    const stepsArr = addForm.steps.split('\n').map((s) => s.trim()).filter(Boolean);
    const inst = await addInstance({
      workflow_id: `wf-new-${Date.now()}`,
      name: addForm.name,
      category: addForm.category,
      is_built_in: false,
      usage_count: 0,
      steps: stepsArr,
      current_step: 0,
      status: 'idle',
      team_id: 'default',
    });
    setWorkflows((prev) => [...prev, {
      id: inst.id,
      name: addForm.name,
      category: addForm.category,
      is_built_in: false,
      usage_count: 0,
      steps: stepsArr,
    }]);
    addModal.closeModal();
    showToast(`工作流"${addForm.name}"已创建`);
    setAddForm({ name: '', category: '通用', steps: '' });
  }

  if (loading && workflows.length === 0) {
    return (
      <CardSkeleton />
    );
  }

  return (
    <div className="flex h-full">
      <ToastOverlay toasts={toasts} />

      {/* Template List */}
      <div className="flex w-64 shrink-0 flex-col border-r border-border bg-surface overflow-y-auto">
        <div className="border-b border-border px-3 py-2.5 flex items-center">
          <span className="text-xs font-bold">工作流模板</span>
          <span className="ml-2 text-[9px] text-text-3">{workflows.length} 个</span>
          <button onClick={hasFeature('customWorkflows') ? addModal.openModal : undefined} className="ml-auto rounded-lg bg-primary/10 p-1 hover:bg-primary/20 disabled:opacity-40" disabled={!hasFeature('customWorkflows')}>
            {!hasFeature('customWorkflows') ? <Lock size={12} className="text-text-3" /> : <Plus size={12} className="text-primary-2" />}
          </button>
        </div>
        <div className="py-1">
          {workflows.map((wf) => (
            <button key={wf.id} onClick={() => setSelectedId(wf.id)} className={cn('flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors', resolvedId === wf.id ? 'bg-primary/10 font-semibold text-primary-2' : 'text-text-2 hover:bg-surface-2' )}>
              <Workflow size={13} className="shrink-0 text-text-3" />
              <div className="min-w-0">
                <div className="truncate">{wf.name}</div>
                <div className="text-[9px] text-text-3 flex flex-wrap items-center gap-2"><Star size={8} />{wf.usage_count}次使用{runningIds.has(wf.id) ? ' · 运行中' : ''}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail */}
      <div className="flex flex-1 flex-col min-w-0 overflow-y-auto">
        {selected ? (
          <>
            <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
              {editingName === selected.id ? (
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="rounded-lg border border-primary/50 bg-surface-2 px-2 py-1 text-sm text-text outline-none" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingName(null); }} />
                  <button onClick={handleSaveEdit} className="rounded-lg bg-success/10 px-2 py-1 text-[10px] text-success hover:bg-success/20"><Check size={12} /></button>
                </div>
              ) : (
                <span className="text-sm font-bold">{selected.name}</span>
              )}
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary-2">{selected.category}</span>
              {selected.is_built_in && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[9px] text-text-3">内置</span>}
              {runningIds.has(selected.id) && <span className="rounded-full bg-success/10 px-2 py-0.5 text-[9px] font-bold text-success">运行中</span>}
              <div className="ml-auto flex flex-wrap gap-2">
                {hasFeature('customWorkflows') ? (
                  <>
                    <button onClick={handleCopy} className="flex flex-wrap items-center gap-1 rounded-lg bg-surface-2 px-3 py-1.5 text-[10px] text-text-3 hover:text-text"><Copy size={10} />复制</button>
                    <button onClick={handleEdit} disabled={selected.is_built_in} className="flex flex-wrap items-center gap-1 rounded-lg bg-surface-2 px-3 py-1.5 text-[10px] text-text-3 hover:text-text disabled:opacity-40"><Edit3 size={10} />编辑</button>
                  </>
                ) : (
                  <button onClick={() => setShowPaywall(true)} className="flex flex-wrap items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-[10px] text-primary-2 hover:bg-primary/20"><Lock size={10} />升级解锁</button>
                )}
                {runningIds.has(selected.id) ? (
                  <button onClick={handleStop} className="flex flex-wrap items-center gap-1 rounded-lg bg-danger/10 px-3 py-1.5 text-[10px] font-semibold text-danger hover:bg-danger/20"><StopCircle size={10} />停止</button>
                ) : (
                  <button onClick={handleStart} className="flex flex-wrap items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-[10px] font-semibold text-white hover:opacity-80"><Play size={10} />启动</button>
                )}
                {!selected.is_built_in && (
                  <button onClick={handleDelete} className="flex flex-wrap items-center gap-1 rounded-lg bg-danger/10 px-3 py-1.5 text-[10px] text-danger hover:bg-danger/20"><Trash2 size={10} />删除</button>
                )}
              </div>
            </div>

            <div className="p-3 md:p-4 space-y-4 max-w-2xl">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-text-3 mb-3">流程步骤</div>
                <div className="space-y-2">
                  {selected.steps.map((step, i) => {
                    const isCurrent = cell.workflow[i] === step && i === cell.wfCurrent;
                    const isDone = i < cell.wfCurrent;
                    return (
                      <div key={i} className="flex flex-wrap items-center gap-3">
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

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-surface p-3">
                  <div className="text-[9px] text-text-3 mb-1">使用次数</div>
                  <div className="text-lg font-extrabold text-text flex flex-wrap items-center gap-2"><Clock size={14} className="text-text-3" />{selected.usage_count}</div>
                </div>
                <div className="rounded-xl border border-border bg-surface p-3">
                  <div className="text-[9px] text-text-3 mb-1">步骤数</div>
                  <div className="text-lg font-extrabold text-text">{selected.steps.length}</div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-text-3 text-sm">选择或创建一个工作流</div>
        )}
      </div>

      {/* Add Workflow Modal */}
      <Modal open={addModal.open} onClose={addModal.closeModal} title="新建工作流"
        footer={
          <div className="flex flex-wrap gap-2">
            <button className={btnSecondary} onClick={addModal.closeModal}>取消</button>
            <button className={btnPrimary} onClick={handleAddSave} disabled={!addForm.name.trim()}>创建</button>
          </div>
        }>
        <ModalField label="工作流名称">
          <input className={inputCls} placeholder="输入工作流名称" value={addForm.name} onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))} />
        </ModalField>
        <ModalField label="分类">
          <select className={inputCls} value={addForm.category} onChange={(e) => setAddForm((p) => ({ ...p, category: e.target.value }))}>
            <option value="通用">通用</option>
            <option value="研发">研发</option>
            <option value="运营">运营</option>
            <option value="产品">产品</option>
          </select>
        </ModalField>
        <ModalField label="流程步骤（每行一步）">
          <textarea className={inputCls} rows={5} placeholder={'需求评审\n开发编码\n测试验证\n上线发布'} value={addForm.steps} onChange={(e) => setAddForm((p) => ({ ...p, steps: e.target.value }))} />
        </ModalField>
      </Modal>
      <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} reason="自定义工作流需要专业版或企业版" feature="custom_workflows" />
    </div>
  );
}

function Plus({ size, className }: { size: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14" /><path d="M12 5v14" />
    </svg>
  );
}
