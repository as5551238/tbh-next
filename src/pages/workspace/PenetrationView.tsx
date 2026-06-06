/**
 * MLOO-Lite 三级穿透视图 — Goal→Project→Task 链路可视化
 * 树形展示完整的目标到执行链路，含进度汇总
 */
import { useState, useMemo } from 'react';
import { useGoals, useTasks, useProjects } from '@/hooks/useMatrix';
import { cn } from '@/lib/utils';
import { Target, FolderKanban, ListTodo, ChevronRight, ChevronDown, Loader2, AlertTriangle, CheckCircle2, Circle } from 'lucide-react';

interface TreeNode {
  id: string;
  type: 'goal' | 'project' | 'task';
  title: string;
  progress: number;
  status: string;
  children: TreeNode[];
  endDate: string | null;
}

export default function PenetrationView() {
  const { goals, loading: goalsLoading } = useGoals();
  const { tasks } = useTasks();
  const { projects } = useProjects();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // 构建树：Goal→Task（Task通过goal_id直接关联Goal）
  const tree = useMemo(() => {
    // TaskRow has goal_id, not projectId
    const taskByGoal: Record<string, TreeNode[]> = {};
    for (const t of tasks) {
      const gid = t.goal_id ?? '__none__';
      if (!taskByGoal[gid]) taskByGoal[gid] = [];
      taskByGoal[gid].push({
        id: t.id, type: 'task', title: t.title,
        progress: t.done ? 100 : (t.status === 'in_progress' ? 50 : 0),
        status: t.status, children: [], endDate: t.due_date,
      });
    }

    // ProjectRow has end_date, no goalId - projects as standalone
    const projectNodes: TreeNode[] = projects.map((p) => ({
      id: p.id, type: 'project', title: p.title, progress: p.progress,
      status: p.status, children: [], endDate: p.end_date,
    }));

    const goalNodes: TreeNode[] = goals.map((g) => ({
      id: g.id, type: 'goal', title: g.title, progress: g.progress,
      status: g.status, children: taskByGoal[g.id] ?? [], endDate: g.end_date,
    }));

    // Orphan tasks (no goal)
    const orphanTasks = taskByGoal['__none__'] ?? [];
    if (orphanTasks.length > 0) {
      goalNodes.push({
        id: '__orphan_tasks__', type: 'goal', title: '未关联目标的任务', progress: 0,
        status: 'active', children: orphanTasks, endDate: null,
      });
    }

    // Orphan projects
    if (projectNodes.length > 0) {
      goalNodes.push({
        id: '__projects__', type: 'goal', title: '项目列表', progress: 0,
        status: 'active', children: projectNodes, endDate: null,
      });
    }

    return goalNodes;
  }, [goals, projects, tasks]);

  // 统计
  const stats = useMemo(() => {
    const goalCount = goals.length;
    const projCount = projects.length;
    const taskCount = tasks.length;
    const doneTasks = tasks.filter((t) => t.done).length;
    return { goalCount, projCount, taskCount, doneTasks, completionRate: taskCount > 0 ? Math.round((doneTasks / taskCount) * 100) : 0 };
  }, [goals, projects, tasks]);

  if (goalsLoading) {
    return <div className="flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary-2" /></div>;
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

    return (
      <div key={node.id}>
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-all hover:bg-surface-2',
            depth === 0 && 'border border-border bg-surface mb-1',
            depth === 1 && 'ml-4 mb-0.5',
            depth === 2 && 'ml-8 mb-0.5',
          )}
          onClick={() => hasChildren && toggleExpand(node.id)}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown size={12} className="text-text-3 shrink-0" /> : <ChevronRight size={12} className="text-text-3 shrink-0" />
          ) : (
            <div className="w-3 shrink-0" />
          )}
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
          {hasChildren && (
            <span className="text-[8px] text-text-3 shrink-0">{node.children.length}</span>
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
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
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
    </div>
  );
}
