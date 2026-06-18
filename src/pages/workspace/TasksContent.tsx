import { useGateCheck } from '@/hooks/useGateCheck';
import PaywallModal from '@/components/PaywallModal';
import { useState, useCallback, type MouseEvent, useMemo, useEffect } from 'react';
import { useTasks } from '@/hooks/useMatrix';
import type { TaskRow } from '@/lib/dataLayer';
import { useMLOOFeedback } from '@/hooks/useMLOOFeedback';
import { cn } from '@/lib/utils';
import { CheckCircle2, Plus, LayoutList, Columns3, Calendar, GanttChart } from 'lucide-react';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { TableRowSkeleton } from '@/components/Skeleton';
import ItemDetailModal, { type FieldDef } from '@/components/ItemDetailModal';
import BulkActionBar from '@/components/BulkActionBar';
import PageHeader from '@/components/PageHeader';
import { t } from '@/lib/i18n';
import { exportToCSV, exportToJSON } from '@/lib/export';
import { usePermission } from '@/hooks/usePermission';
import { recordRender } from '@/lib/monitoring';
import { trackEvent } from '@/lib/behaviorTracker';

type TaskViewMode = 'list' | 'kanban' | 'gantt' | 'calendar';

interface KanbanViewProps {
  tasks: TaskRow[];
  onTaskClick: (t: TaskRow) => void;
  onToggleDone: (e: MouseEvent, t: TaskRow) => void;
  onStatusChange: (id: string, status: string) => void;
  priorityStyle: Record<string, string>;
  priorityLabel: Record<string, string>;
}

interface GanttViewProps {
  tasks: TaskRow[];
  onTaskClick: (t: TaskRow) => void;
}

interface CalendarViewProps {
  tasks: TaskRow[];
  onTaskClick: (t: TaskRow) => void;
  priorityStyle: Record<string, string>;
}

export default function TasksContent() {
  const { can } = usePermission();
  const { tasks, loading, addTask, editTask, removeTask } = useTasks();

  // ── Monitor: render timing ─────────────────────────────────────────
  const _mountT0 = useMemo(() => performance.now(), []);
  useEffect(() => { return () => { recordRender('TasksContent', performance.now() - _mountT0); }; }, [_mountT0]);
  const { showPaywall: tpShow, paywallReason: tpReason, paywallFeature: tpFeat, closePaywall: tpClose, requireLimit: tpLimit } = useGateCheck();
  const { triggerFeedback } = useMLOOFeedback();
  const editModal = useModal();
  const addTaskModal = useModal();
  const [editData, setEditData] = useState<Record<string, unknown> | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<TaskViewMode>('list');
  const [taskExportOpen, setTaskExportOpen] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({ title: '', priority: 'medium', status: 'todo', due_date: '', assignee_id: '', goal_id: '', milestone: '', tags: '', estimated_hours: '' });
  const priorityStyle: Record<string, string> = { urgent: 'bg-danger/10 text-danger', high: 'bg-warn/10 text-warn', medium: 'bg-primary/10 text-primary-2', low: 'bg-surface-2 text-text-3' };
  const priorityLabel: Record<string, string> = { urgent: t('tasks.priorityUrgent'), high: t('tasks.priorityHigh'), medium: t('tasks.priorityMedium'), low: t('tasks.priorityLow') };

  const taskFields: FieldDef[] = [
    { key: 'title', label: t('tasks.taskTitle'), type: 'text' },
    { key: 'priority', label: t('tasks.priority'), type: 'select', options: [{ value: 'high', label: t('tasks.priorityHigh') }, { value: 'medium', label: t('tasks.priorityMedium') }, { value: 'low', label: t('tasks.priorityLow') }] },
    { key: 'status', label: t('tasks.status'), type: 'select', options: [{ value: 'todo', label: t('tasks.statusTodo') }, { value: 'in_progress', label: t('tasks.statusInProgress') }, { value: 'done', label: t('tasks.statusDone') }, { value: 'blocked', label: t('tasks.statusBlocked') }, { value: 'cancelled', label: t('tasks.statusCancelled') }] },
    { key: 'due_date', label: t('tasks.dueDate'), type: 'date' },
    { key: 'assignee_id', label: t('tasks.assignee'), type: 'text' },
    { key: 'milestone', label: t('tasks.milestone'), type: 'text' },
    { key: 'tags', label: t('tasks.tags'), type: 'text' },
    { key: 'estimated_hours', label: t('tasks.estimatedHours'), type: 'number' },
    { key: 'actual_hours', label: t('tasks.actualHours'), type: 'number' },
  ];

  const handleStatusChange = useCallback((id: string, status: string) => {
    editTask(id, { status, done: status === 'done' });
    trackEvent('task_update', { id, status, source: 'kanban_drag' });
  }, [editTask]);

  const handleTaskClick = useCallback((t: typeof tasks[number]) => {
    setEditData({
      id: t.id, title: t.title, priority: t.priority, status: t.status,
      due_date: t.due_date ?? '', assignee_id: t.assignee_id ?? '',
      milestone: (t as unknown as Record<string, unknown>).milestone ?? '',
      tags: Array.isArray((t as unknown as Record<string, unknown>).tags) ? ((t as unknown as Record<string, unknown>).tags as string[]).join(',') : String((t as unknown as Record<string, unknown>).tags ?? ''),
      estimated_hours: ((t as unknown as Record<string, unknown>).estimated_hours as number) ?? 0,
      actual_hours: ((t as unknown as Record<string, unknown>).actual_hours as number) ?? 0,
    });
    editModal.openModal();
  }, [editModal.openModal]);

  const handleTaskSave = useCallback((updated: Record<string, unknown>) => {
    const id = String(updated.id);
    const newStatus = String(updated.status);
    const tagsRaw = String(updated.tags ?? '');
    editTask(id, {
      title: String(updated.title),
      priority: String(updated.priority),
      status: newStatus,
      due_date: updated.due_date ? String(updated.due_date) : null,
      assignee_id: updated.assignee_id ? String(updated.assignee_id) : null,
      milestone: updated.milestone ? String(updated.milestone) : null,
      tags: tagsRaw ? tagsRaw.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      estimated_hours: updated.estimated_hours ? Number(updated.estimated_hours) : null,
      actual_hours: updated.actual_hours ? Number(updated.actual_hours) : null,
    } as Partial<TaskRow>);
    triggerFeedback({ type: 'task_status', action: 'updated', entity: { id, status: newStatus, title: updated.title, goal_id: tasks.find((t) => t.id === id)?.goal_id ?? null } });
  }, [editTask, triggerFeedback, tasks]);

  const handleToggleDone = useCallback((e: MouseEvent, t: typeof tasks[number]) => {
    e.stopPropagation();
    const newStatus = t.done ? 'todo' : 'done';
    editTask(t.id, { status: newStatus });
    trackEvent(newStatus === 'done' ? 'task_complete' : 'task_update', { id: t.id, title: t.title, status: newStatus });
    triggerFeedback({ type: 'task_status', action: 'toggled', entity: { id: t.id, title: t.title, status: newStatus, goal_id: t.goal_id } });
  }, [editTask, triggerFeedback]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);

  const bulkStatus = useCallback((status: string) => {
    selectedIds.forEach((id) => editTask(id, { status, done: status === 'done' }));
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

  const taskExportHeaders = [t('tasks.expName'), t('tasks.expDesc'), t('tasks.expStatus'), t('tasks.expPriority'), t('tasks.expOwner'), t('tasks.expDueDate'), t('tasks.expTags')];
  const handleExportTasksCSV = useCallback(() => {
    const rows = tasks.map((task) => ({ [t('tasks.expName')]: String(task.title ?? ''), [t('tasks.expDesc')]: '', [t('tasks.expStatus')]: String(task.status ?? ''), [t('tasks.expPriority')]: String(task.priority ?? ''), [t('tasks.expOwner')]: String(task.assignee_id ?? ''), [t('tasks.expDueDate')]: String(task.due_date ?? ''), [t('tasks.expTags')]: '' }));
    exportToCSV(taskExportHeaders, rows, 'tasks');
  }, [tasks]);
  const handleExportTasksJSON = useCallback(() => {
    const rows = tasks.map((task) => ({ [t('tasks.expName')]: String(task.title ?? ''), [t('tasks.expDesc')]: '', [t('tasks.expStatus')]: String(task.status ?? ''), [t('tasks.expPriority')]: String(task.priority ?? ''), [t('tasks.expOwner')]: String(task.assignee_id ?? ''), [t('tasks.expDueDate')]: String(task.due_date ?? ''), [t('tasks.expTags')]: '' }));
    exportToJSON(rows, 'tasks');
  }, [tasks]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader icon={<CheckCircle2 size={16} />} title={t('tasks.title')} badge={t('tasks.taskSummary', { total: tasks.length, done: tasks.filter(t => t.done).length, pending: tasks.filter(t => !t.done).length })}>
        {can('tasks:write') && (
        <button className="flex flex-wrap items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20" onClick={() => { if (!tpLimit('maxTasks', tasks.length, t('tasks.paywallMsg'))) return; setNewTaskForm({ title: '', priority: 'medium', status: 'todo', due_date: '', assignee_id: '', goal_id: '', milestone: '', tags: '', estimated_hours: '' }); addTaskModal.openModal(); }}>
          <Plus size={12} />{t('tasks.newTask')}
        </button>
        )}
        {can('reports:export') && (
        <div className="relative">
          <button className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-text-3 hover:text-text-2" onClick={() => setTaskExportOpen((v) => !v)}>{t('tasks.export')} ▾</button>
          {taskExportOpen && (<>
            <div className="fixed inset-0 z-40" onClick={() => setTaskExportOpen(false)} />
            <div className="absolute right-0 top-full z-50 mt-1 min-w-[100px] rounded-lg border border-border bg-surface py-1 shadow-lg">
              <button className="w-full px-3 py-1.5 text-left text-xs text-text-3 hover:bg-surface-2 hover:text-text-2" onClick={() => { setTaskExportOpen(false); handleExportTasksCSV(); }}>{t('tasks.exportCSV')}</button>
              <button className="w-full px-3 py-1.5 text-left text-xs text-text-3 hover:bg-surface-2 hover:text-text-2" onClick={() => { setTaskExportOpen(false); handleExportTasksJSON(); }}>{t('tasks.exportJSON')}</button>
            </div>
          </>)}
        </div>
        )}
      </PageHeader>
      {/* View Mode Switcher */}
      <div className="flex items-center gap-1 px-3 md:px-4 pt-1 pb-2">
        {([
          { key: 'list' as TaskViewMode, label: t('tasks.viewList'), icon: LayoutList },
          { key: 'kanban' as TaskViewMode, label: t('tasks.viewKanban'), icon: Columns3 },
          { key: 'gantt' as TaskViewMode, label: t('tasks.viewGantt'), icon: GanttChart },
          { key: 'calendar' as TaskViewMode, label: t('tasks.viewCalendar'), icon: Calendar },
        ]).map(v => (
          <button key={v.key} onClick={() => setViewMode(v.key)}
            className={cn('flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors', viewMode === v.key ? 'bg-primary/10 text-primary-2' : 'text-text-3 hover:bg-surface-2')}>
            <v.icon size={12} />{v.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2">
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} />)}</div>
      ) : viewMode === 'kanban' ? (
        /* ===== 看板视图 ===== */
        <KanbanView tasks={tasks} onTaskClick={handleTaskClick} onToggleDone={handleToggleDone} onStatusChange={handleStatusChange} priorityStyle={priorityStyle} priorityLabel={priorityLabel} />
      ) : viewMode === 'gantt' ? (
        /* ===== 甘特图视图 ===== */
        <GanttView tasks={tasks} onTaskClick={handleTaskClick} />
      ) : viewMode === 'calendar' ? (
        /* ===== 日历视图 ===== */
        <CalendarView tasks={tasks} onTaskClick={handleTaskClick} priorityStyle={priorityStyle} />
      ) : (
        /* ===== 列表视图（默认） ===== */
        <>{tasks.map((task) => (
        <div key={task.id} className={cn('flex items-center gap-2 md:gap-3 rounded-xl border border-border bg-surface px-3 md:px-4 py-2.5 md:py-3 transition-all hover:border-border-2 cursor-pointer', task.done && 'opacity-50')} onClick={() => handleTaskClick(task)}>
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            <input type="checkbox" checked={selectedIds.has(task.id)} onChange={() => toggleSelect(task.id)} className="h-3.5 w-3.5 accent-primary rounded" />
          </div>
          <div className={cn('h-4 w-4 rounded border-2 shrink-0 flex items-center justify-center', task.done ? 'bg-success border-success' : 'border-border')} onClick={(e) => handleToggleDone(e, task)}>
            {task.done && <CheckCircle2 size={12} className="text-white" />}
          </div>
          <span className={cn('flex-1 text-xs text-text', task.done && 'line-through')}>{task.title}</span>
          <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold', priorityStyle[task.priority] || priorityStyle.medium)}>{priorityLabel[task.priority] || task.priority}</span>
            <span className="text-[10px] text-text-3 shrink-0">{task.due_date}</span>
        </div>
        ))}</>
      )}
      <ItemDetailModal open={editModal.open} onClose={editModal.closeModal} title={t('tasks.editTask')} fields={taskFields} data={editData} onSave={handleTaskSave} onDelete={can('tasks:delete') ? () => { if (editData?.id) { removeTask(String(editData.id)); editModal.closeModal(); } } : undefined} commentTarget={editData?.id ? { type: 'task', id: String(editData.id) } : null} />

      <Modal open={addTaskModal.open} onClose={addTaskModal.closeModal} title={t('tasks.newTaskTitle')}
        footer={
          <div className="flex flex-wrap gap-2">
            <button className={btnSecondary} onClick={addTaskModal.closeModal}>{t('common.cancel')}</button>
            <button className={btnPrimary} onClick={() => { if (!newTaskForm.title.trim()) return; addTask({ title: newTaskForm.title, priority: newTaskForm.priority, status: newTaskForm.status, due_date: newTaskForm.due_date || null, assignee_id: newTaskForm.assignee_id || null, leader_id: null, goal_id: newTaskForm.goal_id || null, done: false, milestone: newTaskForm.milestone || null, tags: newTaskForm.tags ? newTaskForm.tags.split(',').map((s: string) => s.trim()).filter(Boolean) : [], estimated_hours: newTaskForm.estimated_hours ? Number(newTaskForm.estimated_hours) : null } as unknown as Omit<TaskRow, 'id'>); trackEvent('task_create', { title: newTaskForm.title, priority: newTaskForm.priority }); addTaskModal.closeModal(); }} disabled={!newTaskForm.title.trim()}>{t('common.create')}</button>
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
        <ModalField label={t('tasks.milestone')}>
          <input className={inputCls} placeholder={t('tasks.milestonePlaceholder')} value={newTaskForm.milestone} onChange={(e) => setNewTaskForm((p) => ({ ...p, milestone: e.target.value }))} />
        </ModalField>
        <ModalField label={t('tasks.tags')}>
          <input className={inputCls} placeholder={t('tasks.tagsPlaceholder')} value={newTaskForm.tags} onChange={(e) => setNewTaskForm((p) => ({ ...p, tags: e.target.value }))} />
        </ModalField>
        <ModalField label={t('tasks.estimatedHours')}>
          <input type="number" className={inputCls} placeholder="0" value={newTaskForm.estimated_hours} onChange={(e) => setNewTaskForm((p) => ({ ...p, estimated_hours: e.target.value }))} />
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
    </div>
  );
}

// ===== Kanban View =====

// KANBAN_COLUMNS uses lazy i18n via t()
import { t as ti18n } from '@/lib/i18n';

const KANBAN_COLUMNS = [
  { key: 'todo', label: () => ti18n('tasks.statusTodo'), color: 'border-l-surface-2', bg: 'bg-surface-2/30' },
  { key: 'in_progress', label: () => ti18n('tasks.statusInProgress'), color: 'border-l-warn', bg: 'bg-warn/5' },
  { key: 'done', label: () => ti18n('tasks.statusDone'), color: 'border-l-success', bg: 'bg-success/5' },
  { key: 'blocked', label: () => ti18n('tasks.statusBlocked'), color: 'border-l-danger', bg: 'bg-danger/5' },
];

function KanbanView({ tasks, onTaskClick, onToggleDone, onStatusChange, priorityStyle, priorityLabel }: KanbanViewProps) {
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 min-h-[400px]">
      {KANBAN_COLUMNS.map(col => {
        const colTasks = tasks.filter(t => t.status === col.key);
        return (
          <div
            key={col.key}
            className={cn('rounded-xl border border-border p-2 border-l-4 transition-colors', col.bg, col.color, dragOverCol === col.key && 'ring-2 ring-primary/30 bg-primary/5')}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverCol(col.key); }}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={(e) => {
              e.preventDefault();
              const taskId = e.dataTransfer.getData('text/plain');
              if (taskId && col.key !== tasks.find(t => t.id === taskId)?.status) {
                onStatusChange(taskId, col.key);
              }
              setDragOverCol(null);
              setDragTaskId(null);
            }}
          >
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-bold text-text-2">{col.label()}</span>
              <span className="text-[10px] text-text-3 bg-surface rounded-full px-1.5 py-0.5">{colTasks.length}</span>
            </div>
            <div className="space-y-1.5 min-h-[40px] max-h-[60vh] overflow-y-auto">
              {colTasks.map(t => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData('text/plain', t.id); e.dataTransfer.effectAllowed = 'move'; setDragTaskId(t.id); }}
                  onDragEnd={() => { setDragOverCol(null); setDragTaskId(null); }}
                  className={cn(
                    'rounded-lg border border-border bg-surface px-2.5 py-2 cursor-pointer hover:shadow-sm transition-all',
                    t.done && 'opacity-50',
                    dragTaskId === t.id && 'opacity-40 scale-95'
                  )}
                  onClick={() => onTaskClick(t)}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className={cn('h-3 w-3 rounded border-2 shrink-0 flex items-center justify-center', t.done ? 'bg-success border-success' : 'border-border')} onClick={(e) => onToggleDone(e, t)}>
                      {t.done && <CheckCircle2 size={8} className="text-white" />}
                    </div>
                    <span className={cn('text-xs text-text truncate', t.done && 'line-through')}>{t.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5 pl-[18px]">
                    <span className={cn('rounded-full px-1.5 py-0 text-[8px] font-bold', priorityStyle[t.priority] || priorityStyle.medium)}>{priorityLabel[t.priority] || t.priority}</span>
                    {t.due_date && <span className="text-[9px] text-text-3">{t.due_date.slice(5, 10)}</span>}
                  </div>
                </div>
              ))}
              {colTasks.length === 0 && <div className="text-center py-6 text-[10px] text-text-3">{dragOverCol === col.key ? t('tasks.dropHere') : t('tasks.empty')}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ===== Gantt View =====

function GanttView({ tasks, onTaskClick }: GanttViewProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [showDone, setShowDone] = useState(false);

  const dateRange = useMemo(() => {
    const now = new Date();
    const base = new Date(now);
    base.setDate(base.getDate() + weekOffset * 7);
    const days: string[] = [];
    for (let i = -7; i < 30; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      days.push(d.toISOString().slice(0, 10));
    }
    return days;
  }, [weekOffset]);

  const totalDays = dateRange.length;
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayIdx = dateRange.indexOf(todayStr);
  const rangeLabel = `${dateRange[0].slice(5)} ~ ${dateRange[totalDays - 1].slice(5)}`;

  const visibleTasks = useMemo(() => {
    const filtered = showDone ? tasks : tasks.filter(t => t.status !== 'cancelled');
    return filtered.slice(0, 25);
  }, [tasks, showDone]);

  const statusBarColor = (status: string) => {
    if (status === 'in_progress') return 'bg-warn';
    if (status === 'blocked') return 'bg-danger';
    if (status === 'done') return 'bg-success/60';
    return 'bg-primary/60';
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <button onClick={() => setWeekOffset(w => w - 1)} className="text-xs text-text-3 hover:text-text px-2 py-1 rounded hover:bg-surface-2">← {ti18n('tasks.prevWeek')}</button>
        <button onClick={() => setWeekOffset(0)} className="text-xs text-text-3 hover:text-text px-2 py-1 rounded hover:bg-surface-2">{ti18n('tasks.today')}</button>
        <button onClick={() => setWeekOffset(w => w + 1)} className="text-xs text-text-3 hover:text-text px-2 py-1 rounded hover:bg-surface-2">{ti18n('tasks.nextWeek')} →</button>
        <span className="text-[10px] text-text-3">{rangeLabel}</span>
        <label className="flex items-center gap-1 ml-auto text-[10px] text-text-3 cursor-pointer">
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="h-3 w-3 accent-primary" />
          {ti18n('tasks.showDone')}
        </label>
      </div>
      <div className="overflow-x-auto">
        <div className="flex border-b border-border mb-1 min-w-[800px]">
          <div className="w-36 shrink-0 px-2 py-1 text-[10px] font-bold text-text-3">{ti18n('tasks.taskTitle')}</div>
          <div className="flex-1 flex">
            {dateRange.map((d, i) => (
              <div key={d} className={cn('flex-1 text-center text-[8px] py-1 min-w-[28px]', d === todayStr ? 'text-primary-2 font-bold bg-primary/5' : 'text-text-3')}>
                {d.slice(8)}
              </div>
            ))}
          </div>
        </div>
        {visibleTasks.map(task => {
          const taskStart = task.start_date || dateRange[0];
          const taskEnd = task.due_date || dateRange[totalDays - 1];
          const startIdx = Math.max(0, dateRange.indexOf(taskStart.slice(0, 10)));
          const endIdx = Math.min(totalDays - 1, dateRange.indexOf(taskEnd.slice(0, 10)));
          const barLeft = `${(startIdx / totalDays) * 100}%`;
          const barWidth = endIdx > startIdx ? `${((endIdx - startIdx + 1) / totalDays) * 100}%` : '4%';
          const isOverdue = task.due_date && task.due_date < todayStr && task.status !== 'done';

          return (
            <div key={task.id} className="flex items-center min-w-[800px] hover:bg-surface-2/30 cursor-pointer" onClick={() => onTaskClick(task)}>
              <div className={cn('w-36 shrink-0 px-2 py-1.5 text-[10px] truncate', isOverdue && 'text-danger font-bold', task.status === 'done' && 'text-text-3 line-through')}>{task.title}</div>
              <div className="flex-1 relative h-7">
                {todayIdx >= 0 && <div className="absolute top-0 bottom-0 w-px bg-primary/30" style={{ left: `${(todayIdx / totalDays) * 100}%` }} />}
                <div className={cn('absolute top-1.5 h-4 rounded-sm', statusBarColor(task.status))} style={{ left: barLeft, width: barWidth }} title={`${task.title}: ${taskStart?.slice(0, 10)} → ${taskEnd?.slice(0, 10)}`} />
              </div>
            </div>
          );
        })}
        {visibleTasks.length === 0 && <div className="text-center py-8 text-xs text-text-3">{ti18n('tasks.noTasks')}</div>}
      </div>
    </div>
  );
}

// ===== Calendar View =====

function CalendarView({ tasks, onTaskClick, priorityStyle }: CalendarViewProps) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const monthLabel = ti18n('tasks.monthLabel', { year: viewDate.getFullYear(), month: viewDate.getMonth() + 1 });

  const taskMap = useMemo(() => {
    const m = new Map<string, TaskRow[]>();
    tasks.forEach(t => {
      if (t.due_date) {
        const key = t.due_date.slice(0, 10);
        if (!m.has(key)) m.set(key, []);
        m.get(key)!.push(t);
      }
    });
    return m;
  }, [tasks]);

  const taskCountThisMonth = useMemo(() => {
    let count = 0;
    const prefix = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;
    tasks.forEach(t => { if (t.due_date?.startsWith(prefix)) count++; });
    return count;
  }, [tasks, viewDate]);

  const prevMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goToToday = () => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));

  const weekDays = [ti18n('tasks.weekSun'), ti18n('tasks.weekMon'), ti18n('tasks.weekTue'), ti18n('tasks.weekWed'), ti18n('tasks.weekThu'), ti18n('tasks.weekFri'), ti18n('tasks.weekSat')];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="text-xs text-text-3 hover:text-text px-2 py-1 rounded hover:bg-surface-2">← {ti18n('tasks.prevMonth')}</button>
          <button onClick={goToToday} className="text-[10px] text-primary-2 px-2 py-1 rounded hover:bg-primary/10 font-medium">{ti18n('tasks.today')}</button>
          <button onClick={nextMonth} className="text-xs text-text-3 hover:text-text px-2 py-1 rounded hover:bg-surface-2">{ti18n('tasks.nextMonth')} →</button>
        </div>
        <span className="text-sm font-bold text-text">{monthLabel}</span>
        <span className="text-[10px] text-text-3">{ti18n('tasks.monthCount', { count: taskCountThisMonth })}</span>
      </div>
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {weekDays.map(d => (
          <div key={d} className="bg-surface-2 px-2 py-1 text-center text-[9px] font-bold text-text-3">{d}</div>
        ))}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-surface min-h-[60px] p-1" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayTasks = taskMap.get(dateStr) || [];
          const isToday = dateStr === todayStr;
          const isPast = dateStr < todayStr;
          const overdueTasks = dayTasks.filter(t => t.status !== 'done' && t.status !== 'cancelled');
          const doneTasks = dayTasks.filter(t => t.status === 'done');

          return (
            <div key={day} className={cn('bg-surface min-h-[60px] p-1', isToday && 'bg-primary/5', isPast && overdueTasks.length > 0 && 'bg-danger/5')}>
              <div className={cn('text-[10px] mb-0.5', isToday ? 'text-primary-2 font-bold' : isPast && overdueTasks.length > 0 ? 'text-danger' : 'text-text-3')}>{day}</div>
              {dayTasks.slice(0, 2).map(t => (
                <div key={t.id} className={cn('rounded px-1 py-0.5 text-[8px] truncate cursor-pointer hover:opacity-80', t.status === 'done' ? 'bg-success/10 text-success line-through' : priorityStyle[t.priority] || priorityStyle.medium)} onClick={() => onTaskClick(t)}>
                  {t.title}
                </div>
              ))}
              {dayTasks.length > 2 && <div className="text-[8px] text-text-3 pl-1">+{dayTasks.length - 2}{ti18n('tasks.items')}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
