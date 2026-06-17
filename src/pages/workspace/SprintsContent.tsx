import { useState, useMemo } from 'react';
import { useSprints } from '@/hooks/useMatrix';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { useToast, ToastOverlay } from '@/hooks/useToast';
import ItemDetailModal from '@/components/ItemDetailModal';
import { cn } from '@/lib/utils';
import { Zap, Plus, Calendar, CheckCircle2 } from 'lucide-react';
import { CardSkeleton } from '@/components/Skeleton';
import { t } from '@/lib/i18nCore';

/** Lazy i18n status config — same pattern as ActivitiesContent */
const STATUS_CFG: Record<string, { label: () => string; color: string }> = {
  planning: { label: () => t('sprints.statusPlanning'), color: 'bg-yellow-500/20 text-yellow-400' },
  active: { label: () => t('sprints.statusActive'), color: 'bg-green-500/20 text-green-400' },
  completed: { label: () => t('sprints.statusCompleted'), color: 'bg-blue-500/20 text-blue-400' },
};

export default function SprintsContent() {
  const { sprints, loading, addSprint, editSprint, removeSprint } = useSprints();
  const addModal = useModal();
  const editModal = useModal();
  const { toasts, success } = useToast();
  const [selectedSprint, setSelectedSprint] = useState<(typeof sprints)[number] | null>(null);
  const [newItem, setNewItem] = useState({ name: '', goal_id: '', status: 'planning', start_date: '', end_date: '' });

  const sorted = useMemo(() => {
    const order: Record<string, number> = { active: 0, planning: 1, completed: 2 };
    return [...sprints].sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3));
  }, [sprints]);

  const handleAdd = async () => {
    if (!newItem.name.trim()) return;
    await addSprint({ name: newItem.name, goal_id: newItem.goal_id || null, status: newItem.status, start_date: newItem.start_date, end_date: newItem.end_date, total_tasks: 0, completed_tasks: 0, team_id: '__default__' });
    success(t('sprints.toastCreated'));
    setNewItem({ name: '', goal_id: '', status: 'planning', start_date: '', end_date: '' });
    addModal.closeModal();
  };

  if (loading) {
    return (
      <CardSkeleton />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
      <ToastOverlay toasts={toasts} />
      <div className="flex flex-wrap items-center gap-2">
        <Zap size={18} className="text-primary-2" />
        <span className="text-sm font-bold">{t('sprints.title')}</span>
        <span className="text-[10px] text-text-3">{t('sprints.sprintCount', { count: sprints.length })}</span>
        <div className="flex-1" />
        <button onClick={() => { addModal.openModal(); }} className="flex flex-wrap items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary-2 transition-all hover:bg-primary/20">
          <Plus size={12} />
          {t('sprints.createSprint')}
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-text-3">
          <Zap size={32} className="mb-2 opacity-30" />
          <span className="text-xs">{t('sprints.emptyState')}</span>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((sprint) => {
            const cfg = STATUS_CFG[sprint.status] ?? STATUS_CFG.planning;
            const pct = sprint.total_tasks > 0 ? Math.round((sprint.completed_tasks / sprint.total_tasks) * 100) : 0;
            return (
              <div key={sprint.id} className="group rounded-xl border border-border bg-surface px-4 py-3 transition-all hover:border-border-2 hover:shadow-lg cursor-pointer" onClick={() => { setSelectedSprint(sprint); editModal.openModal(); }}>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-text">{sprint.name}</span>
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', cfg.color)}>{cfg.label()}</span>
                  <div className="flex-1" />
                  <button onClick={(e) => { e.stopPropagation(); removeSprint(sprint.id); }} className="opacity-0 group-hover:opacity-100 text-[10px] text-text-3 hover:text-danger transition-opacity">x</button>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[10px] text-text-3 mb-2">
                  <span className="flex flex-wrap items-center gap-1"><Calendar size={10} />{sprint.start_date.slice(0, 10)} ~ {sprint.end_date.slice(0, 10)}</span>
                  <span className="flex flex-wrap items-center gap-1"><CheckCircle2 size={10} />{t('sprints.taskCount', { completed: sprint.completed_tasks, total: sprint.total_tasks })}</span>
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

      <Modal open={addModal.open} onClose={addModal.closeModal} title={t('sprints.createModalTitle')}
        footer={
          <div className="flex flex-wrap gap-2">
            <button className={btnSecondary} onClick={addModal.closeModal}>{t('sprints.cancel')}</button>
            <button className={btnPrimary} onClick={handleAdd} disabled={!newItem.name.trim()}>{t('sprints.create')}</button>
          </div>
        }>
        <ModalField label={t('sprints.fieldName')}>
          <input className={inputCls} placeholder={t('sprints.fieldNamePlaceholder')} value={newItem.name} onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))} />
        </ModalField>
        <ModalField label={t('sprints.fieldGoalId')}>
          <input className={inputCls} placeholder={t('sprints.fieldGoalIdPlaceholder')} value={newItem.goal_id} onChange={(e) => setNewItem((p) => ({ ...p, goal_id: e.target.value }))} />
        </ModalField>
        <ModalField label={t('sprints.fieldStatus')}>
          <select className={inputCls} value={newItem.status} onChange={(e) => setNewItem((p) => ({ ...p, status: e.target.value }))}>
            <option value="planning">{t('sprints.statusPlanning')}</option>
            <option value="active">{t('sprints.statusActive')}</option>
            <option value="completed">{t('sprints.statusCompleted')}</option>
          </select>
        </ModalField>
        <ModalField label={t('sprints.fieldStartDate')}>
          <input type="date" className={inputCls} value={newItem.start_date} onChange={(e) => setNewItem((p) => ({ ...p, start_date: e.target.value }))} />
        </ModalField>
        <ModalField label={t('sprints.fieldEndDate')}>
          <input type="date" className={inputCls} value={newItem.end_date} onChange={(e) => setNewItem((p) => ({ ...p, end_date: e.target.value }))} />
        </ModalField>
      </Modal>

      <ItemDetailModal
        open={editModal.open}
        onClose={editModal.closeModal}
        title={t('sprints.editModalTitle')}
        fields={[
          { key: 'name', label: t('sprints.fieldName'), type: 'text' },
          { key: 'goal_id', label: t('sprints.fieldGoalIdLabel'), type: 'text' },
          { key: 'status', label: t('sprints.fieldStatus'), type: 'select', options: [
            { value: 'planning', label: t('sprints.statusPlanning') }, { value: 'active', label: t('sprints.statusActive') }, { value: 'completed', label: t('sprints.statusCompleted') },
          ]},
          { key: 'start_date', label: t('sprints.fieldStartDate'), type: 'date' },
          { key: 'end_date', label: t('sprints.fieldEndDate'), type: 'date' },
        ]}
        data={selectedSprint as Record<string, unknown> | null}
        commentTarget={selectedSprint?.id ? { type: 'sprint', id: String(selectedSprint.id) } : null}
        onSave={(updated) => {
          const id = updated.id as string;
          editSprint(id, updated);
          success(t('sprints.toastUpdated'));
        }}
        onDelete={() => {
          if (selectedSprint) removeSprint(selectedSprint.id);
          editModal.closeModal();
        }}
      />
    </div>
  );
}
