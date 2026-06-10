import { useGateCheck } from '@/hooks/useGateCheck';
import PaywallModal from '@/components/PaywallModal';
import { useState, useCallback, type MouseEvent } from 'react';
import { useTasks } from '@/hooks/useMatrix';
import type { TaskRow } from '@/lib/dataLayer';
import { useMLOOFeedback } from '@/hooks/useMLOOFeedback';
import { cn } from '@/lib/utils';
import { CheckCircle2, Plus } from 'lucide-react';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { TableRowSkeleton } from '@/components/Skeleton';
import ItemDetailModal, { type FieldDef } from '@/components/ItemDetailModal';
import BulkActionBar from '@/components/BulkActionBar';
import { t } from '@/lib/i18n';
import { exportToCSV, exportToJSON } from '@/lib/export';

export default function TasksContent() {
  const { tasks, loading, addTask, editTask, removeTask } = useTasks();
  const { showPaywall: tpShow, paywallReason: tpReason, paywallFeature: tpFeat, closePaywall: tpClose, requireLimit: tpLimit } = useGateCheck();
  const { triggerFeedback } = useMLOOFeedback();
  const editModal = useModal();
  const addTaskModal = useModal();
  const [editData, setEditData] = useState<Record<string, unknown> | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [taskExportOpen, setTaskExportOpen] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({ title: '', priority: 'medium', status: 'todo', due_date: '', assignee_id: '', goal_id: '' });
  const priorityStyle: Record<string, string> = { urgent: 'bg-danger/10 text-danger', high: 'bg-warn/10 text-warn', medium: 'bg-primary/10 text-primary-2', low: 'bg-surface-2 text-text-3' };
  const priorityLabel: Record<string, string> = { urgent: t('tasks.priorityUrgent'), high: t('tasks.priorityHigh'), medium: t('tasks.priorityMedium'), low: t('tasks.priorityLow') };

  const taskFields: FieldDef[] = [
    { key: 'title', label: t('tasks.taskTitle'), type: 'text' },
    { key: 'priority', label: t('tasks.priority'), type: 'select', options: [{ value: 'high', label: t('tasks.priorityHigh') }, { value: 'medium', label: t('tasks.priorityMedium') }, { value: 'low', label: t('tasks.priorityLow') }] },
    { key: 'status', label: t('tasks.status'), type: 'select', options: [{ value: 'todo', label: t('tasks.statusTodo') }, { value: 'in_progress', label: t('tasks.statusInProgress') }, { value: 'done', label: t('tasks.statusDone') }, { value: 'blocked', label: t('tasks.statusBlocked') }, { value: 'cancelled', label: t('tasks.statusCancelled') }] },
    { key: 'due_date', label: t('tasks.dueDate'), type: 'date' },
    { key: 'assignee_id', label: t('tasks.assignee'), type: 'text' },
  ];

  const handleTaskClick = useCallback((t: typeof tasks[number]) => {
    setEditData({ id: t.id, title: t.title, priority: t.priority, status: t.status, due_date: t.due_date ?? '', assignee_id: t.assignee_id ?? '' });
    editModal.openModal();
  }, [editModal.openModal]);

  const handleTaskSave = useCallback((updated: Record<string, unknown>) => {
    const id = String(updated.id);
    const newStatus = String(updated.status);
    editTask(id, {
      title: String(updated.title),
      priority: String(updated.priority),
      status: newStatus,
      due_date: updated.due_date ? String(updated.due_date) : null,
      assignee_id: updated.assignee_id ? String(updated.assignee_id) : null,
    });
    triggerFeedback({ type: 'task_status', action: 'updated', entity: { id, status: newStatus, title: updated.title, goal_id: tasks.find((t) => t.id === id)?.goal_id ?? null } });
  }, [editTask, triggerFeedback, tasks]);

  const handleToggleDone = useCallback((e: MouseEvent, t: typeof tasks[number]) => {
    e.stopPropagation();
    const newStatus = t.done ? 'todo' : 'done';
    editTask(t.id, { status: newStatus });
    triggerFeedback({ type: 'task_status', action: 'toggled', entity: { id: t.id, title: t.title, status: newStatus, goal_id: t.goal_id } });
  }, [editTask, triggerFeedback]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);

  const bulkStatus = useCallback((status: string) => {
    selectedIds.forEach((id) => editTask(id, { status }));
    setSelectedIds(new Set());
  }, [selectedIds, editTask]);

  const bulkDelete = useCallback(() => {
    selectedIds.forEach((id) => removeTask(id));
    setSelectedIds(new Set());
  }, [selectedIds, removeTask]);

  const bulkAssign = useCallback((assignee: string) => {
    selectedIds.forEach((id) => editTask(id, { assignee_id: assignee }));
    setSelectedIds(new Set());
  }, [selectedIds, editTask]);

  const taskExportHeaders = ['名称', '描述', '状态', '优先级', '负责人', '截止日期', '标签'];
  const handleExportTasksCSV = useCallback(() => {
    const rows = tasks.map((task) => ({ '名称': String(task.title ?? ''), '描述': '', '状态': String(task.status ?? ''), '优先级': String(task.priority ?? ''), '负责人': String(task.assignee_id ?? ''), '截止日期': String(task.due_date ?? ''), '标签': '' }));
    exportToCSV(taskExportHeaders, rows, 'tasks');
  }, [tasks]);
  const handleExportTasksJSON = useCallback(() => {
    const rows = tasks.map((task) => ({ '名称': String(task.title ?? ''), '描述': '', '状态': String(task.status ?? ''), '优先级': String(task.priority ?? ''), '负责人': String(task.assignee_id ?? ''), '截止日期': String(task.due_date ?? ''), '标签': '' }));
    exportToJSON(rows, 'tasks');
  }, [tasks]);

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <CheckCircle2 size={18} className="text-primary-2" />
        <span className="text-sm font-bold">{t('tasks.title')}</span>
        <span className="ml-auto text-[10px] text-text-3">{t('tasks.taskSummary', { total: tasks.length, done: tasks.filter(t => t.done).length, pending: tasks.filter(t => !t.done).length })}</span>
        <button className="flex flex-wrap items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20" onClick={() => { if (!tpLimit('maxTasks', tasks.length, '免费版最多创建20个任务，升级Pro解锁更多')) return; setNewTaskForm({ title: '', priority: 'medium', status: 'todo', due_date: '', assignee_id: '', goal_id: '' }); addTaskModal.openModal(); }}>
          <Plus size={12} />{t('tasks.newTask')}
        </button>
        <div className="relative">
          <button className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-text-3 hover:text-text-2" onClick={() => setTaskExportOpen((v) => !v)}>导出 ▾</button>
          {taskExportOpen && (<>
            <div className="fixed inset-0 z-40" onClick={() => setTaskExportOpen(false)} />
            <div className="absolute right-0 top-full z-50 mt-1 min-w-[100px] rounded-lg border border-border bg-surface py-1 shadow-lg">
              <button className="w-full px-3 py-1.5 text-left text-xs text-text-3 hover:bg-surface-2 hover:text-text-2" onClick={() => { setTaskExportOpen(false); handleExportTasksCSV(); }}>导出 CSV</button>
              <button className="w-full px-3 py-1.5 text-left text-xs text-text-3 hover:bg-surface-2 hover:text-text-2" onClick={() => { setTaskExportOpen(false); handleExportTasksJSON(); }}>导出 JSON</button>
            </div>
          </>)}
        </div>
      </div>
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} />)}</div>
      ) : tasks.map((t) => (
        <div key={t.id} className={cn('flex items-center gap-2 md:gap-3 rounded-xl border border-border bg-surface px-3 md:px-4 py-2.5 md:py-3 transition-all hover:border-border-2 cursor-pointer', t.done && 'opacity-50')} onClick={() => handleTaskClick(t)}>
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            <input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => toggleSelect(t.id)} className="h-3.5 w-3.5 accent-primary rounded" />
          </div>
          <div className={cn('h-4 w-4 rounded border-2 shrink-0 flex items-center justify-center', t.done ? 'bg-success border-success' : 'border-border')} onClick={(e) => handleToggleDone(e, t)}>
            {t.done && <CheckCircle2 size={12} className="text-white" />}
          </div>
          <span className={cn('flex-1 text-xs text-text', t.done && 'line-through')}>{t.title}</span>
          <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold', priorityStyle[t.priority] || priorityStyle.medium)}>{priorityLabel[t.priority] || t.priority}</span>
            <span className="text-[10px] text-text-3 shrink-0">{t.due_date}</span>
        </div>
      ))}
      <ItemDetailModal open={editModal.open} onClose={editModal.closeModal} title={t('tasks.editTask')} fields={taskFields} data={editData} onSave={handleTaskSave} onDelete={() => { if (editData?.id) { removeTask(String(editData.id)); editModal.closeModal(); } }} commentTarget={editData?.id ? { type: 'task', id: String(editData.id) } : null} />

      <Modal open={addTaskModal.open} onClose={addTaskModal.closeModal} title={t('tasks.newTaskTitle')}
        footer={
          <div className="flex flex-wrap gap-2">
            <button className={btnSecondary} onClick={addTaskModal.closeModal}>{t('common.cancel')}</button>
            <button className={btnPrimary} onClick={() => { if (!newTaskForm.title.trim()) return; addTask({ title: newTaskForm.title, priority: newTaskForm.priority, status: newTaskForm.status, due_date: newTaskForm.due_date || null, assignee_id: newTaskForm.assignee_id || null, leader_id: null, goal_id: newTaskForm.goal_id || null, done: false } as unknown as Omit<TaskRow, 'id'>); addTaskModal.closeModal(); }} disabled={!newTaskForm.title.trim()}>{t('common.create')}</button>
          </div>
        }>
        <ModalField label={t('tasks.taskTitle')}>
          <input className={inputCls} placeholder={t('tasks.taskTitlePlaceholder')} value={newTaskForm.title} onChange={(e) => setNewTaskForm((p) => ({ ...p, title: e.target.value }))} />
        </ModalField>
        <ModalField label={t('tasks.priority')}>
          <select className={inputCls} value={newTaskForm.priority} onChange={(e) => setNewTaskForm((p) => ({ ...p, priority: e.target.value }))}>
            <option value="urgent">{t('tasks.priorityUrgent')}</option>
            <option value="high">{t('tasks.priorityHigh')}</option>
            <option value="medium">{t('tasks.priorityMedium')}</option>
            <option value="low">{t('tasks.priorityLow')}</option>
          </select>
        </ModalField>
        <ModalField label={t('tasks.status')}>
          <select className={inputCls} value={newTaskForm.status} onChange={(e) => setNewTaskForm((p) => ({ ...p, status: e.target.value }))}>
            <option value="todo">{t('tasks.statusTodo')}</option>
            <option value="in_progress">{t('tasks.statusInProgress')}</option>
            <option value="done">{t('tasks.statusDone')}</option>
          </select>
        </ModalField>
        <ModalField label={t('tasks.dueDate')}>
          <input type="date" className={inputCls} value={newTaskForm.due_date} onChange={(e) => setNewTaskForm((p) => ({ ...p, due_date: e.target.value }))} />
        </ModalField>
        <ModalField label={t('tasks.assignee')}>
          <input className={inputCls} placeholder={t('tasks.assigneePlaceholder')} value={newTaskForm.assignee_id} onChange={(e) => setNewTaskForm((p) => ({ ...p, assignee_id: e.target.value }))} />
        </ModalField>
        <ModalField label={t('tasks.linkedGoalId')}>
          <input className={inputCls} placeholder={t('tasks.linkedGoalIdPlaceholder')} value={newTaskForm.goal_id} onChange={(e) => setNewTaskForm((p) => ({ ...p, goal_id: e.target.value }))} />
        </ModalField>
      </Modal>

      <BulkActionBar
        selectedCount={selectedIds.size}
        onSelectAll={() => setSelectedIds(new Set(tasks.map((t) => t.id)))}
        onDeselectAll={() => setSelectedIds(new Set())}
        onBatchStatus={bulkStatus}
        onBatchDelete={bulkDelete}
        onBatchAssign={bulkAssign}
      />
      <PaywallModal open={tpShow} onClose={tpClose} reason={tpReason} feature={tpFeat} />
    </div>
  );
}
