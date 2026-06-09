import { useState, useMemo } from 'react';
import { useSprints } from '@/hooks/useMatrix';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { useToast, ToastOverlay } from '@/hooks/useToast';
import ItemDetailModal from '@/components/ItemDetailModal';
import { cn } from '@/lib/utils';
import { hasFeature } from '@/lib/subscription';
import { Zap, Plus, Lock, Loader2, Calendar, CheckCircle2 } from 'lucide-react';
import { CardSkeleton } from '@/components/Skeleton';

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  planning: { label: '规划中', color: 'bg-yellow-500/20 text-yellow-400' },
  active: { label: '进行中', color: 'bg-green-500/20 text-green-400' },
  completed: { label: '已完成', color: 'bg-blue-500/20 text-blue-400' },
};

export default function SprintsContent() {
  const isPro = hasFeature('advancedAnalytics' as never);
  const { sprints, loading, addSprint, editSprint, removeSprint } = useSprints();
  const addModal = useModal();
  const editModal = useModal();
  const { toasts, success } = useToast();
  const [selectedSprint, setSelectedSprint] = useState<(typeof sprints)[number] | null>(null);
  const [newItem, setNewItem] = useState({ name: '', goal_id: '', status: 'planning', start_date: '', end_date: '' });

  const sorted = useMemo(() => {
    const order = { active: 0, planning: 1, completed: 2 };
    return [...sprints].sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3));
  }, [sprints]);

  const handleAdd = async () => {
    if (!newItem.name.trim()) return;
    await addSprint({ name: newItem.name, goal_id: newItem.goal_id || null, status: newItem.status, start_date: newItem.start_date, end_date: newItem.end_date, total_tasks: 0, completed_tasks: 0, team_id: '' });
    success('冲刺已创建');
    setNewItem({ name: '', goal_id: '', status: 'planning', start_date: '', end_date: '' });
    addModal.closeModal();
  };

  if (loading) {
    return (
      <CardSkeleton />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <ToastOverlay toasts={toasts} />
      <div className="flex items-center gap-2">
        <Zap size={18} className="text-primary-2" />
        <span className="text-sm font-bold">冲刺管理</span>
        <span className="text-[10px] text-text-3">{sprints.length} 个冲刺</span>
        <div className="flex-1" />
        <button onClick={() => { if (!isPro) return; addModal.openModal(); }} className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary-2 transition-all hover:bg-primary/20">
          <Plus size={12} />
          新建冲刺
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-text-3">
          <Zap size={32} className="mb-2 opacity-30" />
          <span className="text-xs">暂无冲刺</span>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((sprint) => {
            const cfg = STATUS_CFG[sprint.status] ?? STATUS_CFG.planning;
            const pct = sprint.total_tasks > 0 ? Math.round((sprint.completed_tasks / sprint.total_tasks) * 100) : 0;
            return (
              <div key={sprint.id} className="group rounded-xl border border-border bg-surface px-4 py-3 transition-all hover:border-border-2 hover:shadow-lg cursor-pointer" onClick={() => { setSelectedSprint(sprint); editModal.openModal(); }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-text">{sprint.name}</span>
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', cfg.color)}>{cfg.label}</span>
                  <div className="flex-1" />
                  <button onClick={(e) => { e.stopPropagation(); removeSprint(sprint.id); }} className="opacity-0 group-hover:opacity-100 text-[10px] text-text-3 hover:text-danger transition-opacity">x</button>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-text-3 mb-2">
                  <span className="flex items-center gap-1"><Calendar size={10} />{sprint.start_date.slice(0, 10)} ~ {sprint.end_date.slice(0, 10)}</span>
                  <span className="flex items-center gap-1"><CheckCircle2 size={10} />{sprint.completed_tasks}/{sprint.total_tasks} 任务</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                  <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="text-right text-[9px] text-text-3 mt-1">{pct}%</div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={addModal.open} onClose={addModal.closeModal} title="新建冲刺"
        footer={
          <div className="flex gap-2">
            <button className={btnSecondary} onClick={addModal.closeModal}>取消</button>
            <button className={btnPrimary} onClick={handleAdd} disabled={!newItem.name.trim()}>创建</button>
          </div>
        }>
        <ModalField label="名称">
          <input className={inputCls} placeholder="冲刺名称" value={newItem.name} onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))} />
        </ModalField>
        <ModalField label="关联目标ID">
          <input className={inputCls} placeholder="目标ID（可选）" value={newItem.goal_id} onChange={(e) => setNewItem((p) => ({ ...p, goal_id: e.target.value }))} />
        </ModalField>
        <ModalField label="状态">
          <select className={inputCls} value={newItem.status} onChange={(e) => setNewItem((p) => ({ ...p, status: e.target.value }))}>
            <option value="planning">规划中</option>
            <option value="active">进行中</option>
            <option value="completed">已完成</option>
          </select>
        </ModalField>
        <ModalField label="开始日期">
          <input type="date" className={inputCls} value={newItem.start_date} onChange={(e) => setNewItem((p) => ({ ...p, start_date: e.target.value }))} />
        </ModalField>
        <ModalField label="结束日期">
          <input type="date" className={inputCls} value={newItem.end_date} onChange={(e) => setNewItem((p) => ({ ...p, end_date: e.target.value }))} />
        </ModalField>
      </Modal>

      <ItemDetailModal
        open={editModal.open}
        onClose={editModal.closeModal}
        title="编辑冲刺"
        fields={[
          { key: 'name', label: '名称', type: 'text' },
          { key: 'goal_id', label: '关联目标ID', type: 'text' },
          { key: 'status', label: '状态', type: 'select', options: [
            { value: 'planning', label: '规划中' }, { value: 'active', label: '进行中' }, { value: 'completed', label: '已完成' },
          ]},
          { key: 'start_date', label: '开始日期', type: 'date' },
          { key: 'end_date', label: '结束日期', type: 'date' },
        ]}
        data={selectedSprint as Record<string, unknown> | null}
        commentTarget={selectedSprint?.id ? { type: 'sprint', id: String(selectedSprint.id) } : null}
        onSave={(updated) => {
          const id = updated.id as string;
          editSprint(id, updated);
          success('冲刺已更新');
        }}
        onDelete={() => {
          if (selectedSprint) removeSprint(selectedSprint.id);
          editModal.closeModal();
        }}
      />
    </div>
  );
}
