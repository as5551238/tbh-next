/**
 * MLOO-Lite 三级穿透视图 — Goal→Project→Task 链路可视化
 * 树形展示完整的目标到执行链路，含进度汇总 + inline editing
 */
import { useState, useMemo, useCallback } from 'react';
import { useGoals, useTasks, useProjects } from '@/hooks/useMatrix';
import { useToast, ToastOverlay } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { Target, FolderKanban, ListTodo, ChevronRight, ChevronDown, AlertTriangle, CheckCircle2, Circle, Edit3, Trash2, Link2, Unlink } from 'lucide-react';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { CardSkeleton } from '@/components/Skeleton';

interface TreeNode {
  id: string;
  type: 'goal' | 'project' | 'task';
  title: string;
  progress: number;
  status: string;
  children: TreeNode[];
  endDate: string | null;
  goalId?: string;
}

export default function PenetrationView() {
  const { goals, loading: goalsLoading, editGoal, removeGoal } = useGoals();
  const { tasks, editTask, removeTask } = useTasks();
  const { projects, editProject, removeProject } = useProjects();
  const { toasts, success } = useToast();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const editModal = useModal();
  const linkModal = useModal();

  const [editNode, setEditNode] = useState<TreeNode | null>(null);
  const [editForm, setEditForm] = useState({ title: '', status: '' });
  const [linkTaskId, setLinkTaskId] = useState<string | null>(null);
  const [linkGoalId, setLinkGoalId] = useState('');

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Build tree: Goal→Task (Task via goal_id)
  const tree = useMemo(() => {
    const taskByGoal: Record<string, TreeNode[]> = {};
    for (const t of tasks) {
      const gid = t.goal_id ?? '__none__';
      if (!taskByGoal[gid]) taskByGoal[gid] = [];
      taskByGoal[gid].push({
        id: t.id, type: 'task', title: t.title,
        progress: t.done ? 100 : (t.status === 'in_progress' ? 50 : 0),
        status: t.status, children: [], endDate: t.due_date,
        goalId: t.goal_id ?? undefined,
      });
    }

    const projectNodes: TreeNode[] = projects.map((p) => ({
      id: p.id, type: 'project', title: p.title, progress: p.progress,
      status: p.status, children: [], endDate: p.end_date,
    }));

    const goalNodes: TreeNode[] = goals.map((g) => ({
      id: g.id, type: 'goal', title: g.title, progress: g.progress,
      status: g.status, children: taskByGoal[g.id] ?? [], endDate: g.end_date,
    }));

    const orphanTasks = taskByGoal['__none__'] ?? [];
    if (orphanTasks.length > 0) {
      goalNodes.push({
        id: '__orphan_tasks__', type: 'goal', title: '未关联目标的任务', progress: 0,
        status: 'active', children: orphanTasks, endDate: null,
      });
    }

    if (projectNodes.length > 0) {
      goalNodes.push({
        id: '__projects__', type: 'goal', title: '项目列表', progress: 0,
        status: 'active', children: projectNodes, endDate: null,
      });
    }

    return goalNodes;
  }, [goals, projects, tasks]);

  const stats = useMemo(() => {
    const goalCount = goals.length;
    const projCount = projects.length;
    const taskCount = tasks.length;
    const doneTasks = tasks.filter((t) => t.done).length;
    return { goalCount, projCount, taskCount, doneTasks, completionRate: taskCount > 0 ? Math.round((doneTasks / taskCount) * 100) : 0 };
  }, [goals, projects, tasks]);

  const handleEditOpen = useCallback((node: TreeNode) => {
    setEditNode(node);
    setEditForm({ title: node.title, status: node.status });
    editModal.openModal();
  }, [editModal]);

  const handleEditSave = useCallback(async () => {
    if (!editNode) return;
    if (editNode.type === 'goal' && !editNode.id.startsWith('__')) {
      await editGoal(editNode.id, { title: editForm.title, status: editForm.status });
    } else if (editNode.type === 'task') {
      await editTask(editNode.id, { title: editForm.title, status: editForm.status });
    } else if (editNode.type === 'project') {
      await editProject(editNode.id, { title: editForm.title, status: editForm.status });
    }
    editModal.closeModal();
    success(`${editNode.title} 已更新`);
  }, [editNode, editForm, editGoal, editTask, editProject, editModal, success]);

  const handleDelete = useCallback(async () => {
    if (!editNode) return;
    if (editNode.type === 'goal' && !editNode.id.startsWith('__')) {
      await removeGoal(editNode.id);
    } else if (editNode.type === 'task') {
      await removeTask(editNode.id);
    } else if (editNode.type === 'project') {
      await removeProject(editNode.id);
    }
    editModal.closeModal();
    success(`${editNode.title} 已删除`);
  }, [editNode, removeGoal, removeTask, removeProject, editModal, success]);

  const handleLinkOpen = useCallback((taskId: string, currentGoalId?: string) => {
    setLinkTaskId(taskId);
    setLinkGoalId(currentGoalId ?? '');
    linkModal.openModal();
  }, [linkModal]);

  const handleLinkSave = useCallback(async () => {
    if (!linkTaskId) return;
    await editTask(linkTaskId, { goal_id: linkGoalId || null });
    linkModal.closeModal();
    success(linkGoalId ? '任务已关联目标' : '任务已取消关联');
  }, [linkTaskId, linkGoalId, editTask, linkModal, success]);

  if (goalsLoading) {
    return <CardSkeleton />;
  }

  const typeIcon = { goal: Target, project: FolderKanban, task: ListTodo };
  const typeColor = { goal: 'text-primary-2', project: 'text-accent', task: 'text-text-2' };
  const typeBg = { goal: 'bg-primary/10', project: 'bg-accent/10', task: 'bg-surface-2' };

  function renderNode(node: TreeNode, depth: number) {
    const Icon = typeIcon[node.type];
    const isExpanded = expanded.has(node.id);
    const hasChildren = node.children.length > 0;
    const progressColor = node.progress >= 80 ? 'bg-success' : node.progress >= 40 ? 'bg-primary' : node.progress >= 20 ? 'bg-warn' : 'bg-danger';
    const statusIcon = node.progress >= 100
      ? <CheckCircle2 size={12} className="text-success" />
      : node.status === 'at_risk' || node.status === 'blocked'
        ? <AlertTriangle size={12} className="text-warn" />
        : <Circle size={12} className="text-text-3" />;
    const isVirtualNode = node.id.startsWith('__');

    return (
      <div key={node.id}>
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 transition-all hover:bg-surface-2 group',
            depth === 0 && 'border border-border bg-surface mb-1',
            depth === 1 && 'ml-4 mb-0.5',
            depth === 2 && 'ml-8 mb-0.5',
          )}
        >
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0 cursor-pointer" onClick={() => hasChildren && toggleExpand(node.id)}>
            {hasChildren ? (
              isExpanded ? <ChevronDown size={12} className="text-text-3" /> : <ChevronRight size={12} className="text-text-3" />
            ) : (
              <div className="w-3" />
            )}
          </div>
          <div className={cn('flex h-6 w-6 items-center justify-center rounded shrink-0', typeBg[node.type])}>
            <Icon size={12} className={typeColor[node.type]} />
          </div>
          <span className={cn('text-xs flex-1 truncate', depth === 0 ? 'font-semibold text-text' : 'text-text-2')}>
            {node.title}
          </span>
          {statusIcon}
          <div className="w-16 h-1.5 rounded-full bg-surface-2 overflow-hidden shrink-0">
            <div className={cn('h-full rounded-full transition-all', progressColor)} style={{ width: `${Math.min(100, node.progress)}%` }} />
          </div>
          <span className="text-[9px] text-text-3 w-8 text-right shrink-0">{node.progress}%</span>
          {hasChildren && <span className="text-[8px] text-text-3 shrink-0">{node.children.length}</span>}
          {/* Action buttons — visible on hover */}
          {!isVirtualNode && (
            <div className="flex flex-wrap items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button onClick={(e) => { e.stopPropagation(); handleEditOpen(node); }} className="rounded p-0.5 hover:bg-surface-2/80" aria-label="编辑">
                <Edit3 size={10} className="text-text-3" />
              </button>
              {node.type === 'task' && (
                <button onClick={(e) => { e.stopPropagation(); handleLinkOpen(node.id, node.goalId); }} className="rounded p-0.5 hover:bg-surface-2/80" aria-label="关联目标">
                  <Link2 size={10} className="text-text-3" />
                </button>
              )}
            </div>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
      <ToastOverlay toasts={toasts} />
      <div className="flex flex-wrap items-center gap-2">
        <Target size={18} className="text-primary-2" />
        <span className="text-sm font-bold">三级穿透视图</span>
        <span className="text-[10px] text-text-3 ml-1">Goal → Project → Task</span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { label: '目标', value: stats.goalCount, color: 'text-primary-2' },
          { label: '项目', value: stats.projCount, color: 'text-accent' },
          { label: '任务', value: stats.taskCount, color: 'text-text-2' },
          { label: '完成率', value: `${stats.completionRate}%`, color: 'text-success' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-surface-2/50 p-2 text-center">
            <div className={cn('text-sm font-bold', s.color)}>{s.value}</div>
            <div className="text-[9px] text-text-3">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        {tree.length === 0 ? (
          <div className="text-center py-8">
            <Target size={24} className="mx-auto text-text-3 mb-2" />
            <div className="text-xs text-text-3">暂无目标数据</div>
          </div>
        ) : (
          tree.map((node) => renderNode(node, 0))
        )}
      </div>

      {/* Edit Modal */}
      <Modal open={editModal.open} onClose={editModal.closeModal} title={`编辑${editNode?.type === 'goal' ? '目标' : editNode?.type === 'task' ? '任务' : '项目'}`}
        footer={
          <div className="flex flex-wrap gap-2">
            {editNode && !editNode.id.startsWith('__') && (
              <button className="flex flex-wrap items-center gap-1 rounded-lg bg-danger/10 px-3 py-1.5 text-[10px] text-danger hover:bg-danger/20 mr-auto" onClick={handleDelete}>
                <Trash2 size={10} />删除
              </button>
            )}
            <button className={btnSecondary} onClick={editModal.closeModal}>取消</button>
            <button className={btnPrimary} onClick={handleEditSave} disabled={!editForm.title.trim()}>保存</button>
          </div>
        }>
        <ModalField label="名称">
          <input className={inputCls} value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} />
        </ModalField>
        <ModalField label="状态">
          <select className={inputCls} value={editForm.status} onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}>
            <option value="active">进行中</option>
            <option value="completed">已完成</option>
            <option value="paused">暂停</option>
            <option value="at_risk">有风险</option>
            <option value="blocked">阻塞</option>
            <option value="todo">待办</option>
            <option value="in_progress">执行中</option>
            <option value="done">已完成</option>
          </select>
        </ModalField>
      </Modal>

      {/* Link Task to Goal Modal */}
      <Modal open={linkModal.open} onClose={linkModal.closeModal} title="关联目标"
        footer={
          <div className="flex flex-wrap gap-2">
            <button className={btnSecondary} onClick={linkModal.closeModal}>取消</button>
            <button className={btnPrimary} onClick={handleLinkSave}>关联</button>
          </div>
        }>
        <ModalField label="选择目标">
          <select className={inputCls} value={linkGoalId || '__EMPTY__'} onChange={(e) => setLinkGoalId(e.target.value === '__EMPTY__' ? '' : e.target.value)}>
            <option value="__EMPTY__">-- 无关联 --</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
        </ModalField>
        {linkGoalId && (
          <div className="text-[10px] text-text-3 mt-1">任务将关联到: {goals.find((g) => g.id === linkGoalId)?.title}</div>
        )}
      </Modal>
    </div>
  );
}
