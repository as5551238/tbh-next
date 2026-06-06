import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAppStore } from '@/stores/appStore';
import { useMatrixCell, useIndustryColor, useGoals, useTasks, useProjects, useKnowledgeDocs, type KeyResultItem } from '@/hooks/useMatrix';
import { cn, safeStr } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, Target, CheckCircle2, FolderKanban, BarChart3, BookOpen, Brain, ArrowRight, Bot, Loader2, Zap } from 'lucide-react';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import ItemDetailModal, { type FieldDef } from '@/components/ItemDetailModal';
import { computeAutoProgress, detectDeviations } from '@/lib/reviewEngine';
import { useMLOOFeedback } from '@/hooks/useMLOOFeedback';

// Lazy-load heavier sub-views
import ScheduleContent from '@/pages/workspace/ScheduleContent';
import NotificationsContent from '@/pages/workspace/NotificationsContent';
import InsightContent from '@/pages/workspace/InsightContent';
import ReportsContent from '@/pages/workspace/ReportsContent';
import PredictionContent from '@/pages/workspace/PredictionContent';
import DocsContent from '@/pages/workspace/DocsContent';
import ExperienceContent from '@/pages/workspace/ExperienceContent';
import MembersContent from '@/pages/workspace/MembersContent';
import RolesContent from '@/pages/workspace/RolesContent';
import OrgContent from '@/pages/workspace/OrgContent';
import AdminContent from '@/pages/workspace/AdminContent';
import ReviewContent from '@/pages/workspace/ReviewContent';
import PenetrationView from '@/pages/workspace/PenetrationView';
import ModulePageStub from '@/pages/ModulePageStub';

const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus };

function OverviewContent() {
  const setInterface = useAppStore((s) => s.setInterface);
  const indColor = useIndustryColor();
  const { cell, loading } = useMatrixCell();

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="rounded-xl border border-border p-4 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${indColor}08 0%, ${indColor}03 100%)` }}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10" style={{ backgroundColor: indColor }} />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">☀️</span>
            <span className="text-sm font-bold">晨间聚焦</span>
            <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ backgroundColor: indColor + '20', color: indColor }}>晨报</span>
          </div>
          <p className="text-sm leading-relaxed text-text-2">{cell.morning}</p>
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-bold text-text-3 uppercase tracking-wider">核心指标</div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {cell.kpis.map((kpi) => {
            const TrendIcon = TREND_ICON[kpi.trend];
            return (
              <div key={kpi.name} className="rounded-xl border border-border bg-surface p-3 transition-all hover:border-border-2 hover:shadow-lg hover:-translate-y-0.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-text-3">{kpi.name}</span>
                  <TrendIcon size={13} className={kpi.status === 'good' ? 'text-success' : kpi.status === 'warn' ? 'text-warn' : 'text-danger'} />
                </div>
                <div className={cn('text-xl font-extrabold', kpi.status === 'good' ? 'text-success' : kpi.status === 'warn' ? 'text-warn' : 'text-danger')}>
                  {kpi.value}
                </div>
                <div className="mt-1 text-[10px] text-text-3">目标 {kpi.target}</div>
                <div className="mt-2 h-1 rounded-full bg-surface-2 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{
                    width: kpi.status === 'good' ? '90%' : kpi.status === 'warn' ? '60%' : '30%',
                    backgroundColor: kpi.status === 'good' ? '#22c984' : kpi.status === 'warn' ? '#ffc44d' : '#ff5c6a',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button onClick={() => setInterface('collab')} className="group flex items-center justify-between rounded-xl border border-border bg-surface p-4 transition-all hover:border-primary/30 hover:shadow-lg">
          <div><div className="text-xs font-semibold text-text">团队协作台</div><div className="text-[10px] text-text-3 mt-0.5">{cell.channels.length} 个频道活跃</div></div>
          <ArrowRight size={16} className="text-text-3 transition-transform group-hover:translate-x-1 group-hover:text-primary-2" />
        </button>
        <button onClick={() => setInterface('ai')} className="group flex items-center justify-between rounded-xl border border-border bg-surface p-4 transition-all hover:border-primary/30 hover:shadow-lg">
          <div><div className="text-xs font-semibold text-text">个人AI台</div><div className="text-[10px] text-text-3 mt-0.5">{cell.agents.length} 个AI同事可用</div></div>
          <ArrowRight size={16} className="text-text-3 transition-transform group-hover:translate-x-1 group-hover:text-primary-2" />
        </button>
      </div>
    </div>
  );
}

function GoalsContent() {
  const { goals, loading, editGoal } = useGoals();
  const { tasks } = useTasks();
  const goalModal = useModal();
  const [editGoalData, setEditGoalData] = useState<{ id: string; title: string; status: string; progress: number; key_results: string[] } | null>(null);

  // Compute auto-progress for each goal
  const autoProgressMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const g of goals) {
      map[g.id] = computeAutoProgress(g.id, tasks);
    }
    return map;
  }, [goals, tasks]);

  const handleCardClick = useCallback((g: typeof goals[number]) => {
    const krTexts = g.key_results.map((kr) => typeof kr === 'string' ? kr : (kr as KeyResultItem).text || String(kr));
    setEditGoalData({
      id: g.id,
      title: g.title,
      status: g.status === 'active' || g.status === 'on_track' ? 'on_track' : 'at_risk',
      progress: g.progress,
      key_results: krTexts,
    });
    goalModal.openModal();
  }, [goalModal.openModal]);

  const handleSyncAutoProgress = useCallback((g: typeof goals[number]) => {
    const autoProg = autoProgressMap[g.id];
    if (autoProg >= 0 && autoProg !== g.progress) {
      editGoal(g.id, { progress: autoProg });
    }
  }, [autoProgressMap, editGoal]);

  const handleEditGoalSave = useCallback(() => {
    if (!editGoalData) return;
    editGoal(editGoalData.id, {
      title: editGoalData.title,
      status: editGoalData.status,
      progress: editGoalData.progress,
      key_results: editGoalData.key_results.map((text) => ({ text, selected: false })) as typeof goals[number]['key_results'],
    });
    goalModal.closeModal();
    setEditGoalData(null);
  }, [editGoalData, editGoal, goalModal.closeModal, goals]);

  const handleKrTextChange = useCallback((idx: number, value: string) => {
    setEditGoalData((prev) => prev ? { ...prev, key_results: prev.key_results.map((t, i) => i === idx ? value : t) } : null);
  }, []);

  const handleAddKr = useCallback(() => {
    setEditGoalData((prev) => prev ? { ...prev, key_results: [...prev.key_results, ''] } : null);
  }, []);

  const handleRemoveKr = useCallback((idx: number) => {
    setEditGoalData((prev) => prev ? { ...prev, key_results: prev.key_results.filter((_, i) => i !== idx) } : null);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Target size={18} className="text-primary-2" />
        <span className="text-sm font-bold">目标 OKR</span>
        <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary-2">{goals.length} 个进行中</span>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin text-primary-2" /></div>
      ) : goals.map((g) => {
        const autoProg = autoProgressMap[g.id];
        const hasAuto = autoProg >= 0;
        const progMismatch = hasAuto && autoProg !== g.progress;
        return (
        <div key={g.id} className="rounded-xl border border-border bg-surface p-4 transition-all hover:border-border-2 hover:shadow-lg cursor-pointer" onClick={() => handleCardClick(g)}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-text">{g.title}</span>
            <div className="flex items-center gap-2">
              {progMismatch && (
                <button className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold bg-accent/10 text-accent hover:bg-accent/20 transition-colors" onClick={(e) => { e.stopPropagation(); handleSyncAutoProgress(g); }}>
                  <Zap size={9} />同步{autoProg}%
                </button>
              )}
              <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold', g.status === 'active' || g.status === 'on_track' ? 'bg-success/10 text-success' : 'bg-warn/10 text-warn')}>
                {g.status === 'active' || g.status === 'on_track' ? '正常' : '风险'}
              </span>
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-surface-2 mb-1.5 overflow-hidden relative">
            <div className={cn('h-full rounded-full transition-all', g.status === 'active' || g.status === 'on_track' ? 'bg-success' : 'bg-warn')} style={{ width: `${g.progress}%` }} />
            {hasAuto && progMismatch && (
              <div className="absolute top-0 left-0 h-full rounded-full border border-accent/40 bg-accent/10 transition-all" style={{ width: `${autoProg}%` }} />
            )}
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-text-3">手动 {g.progress}%</span>
            {hasAuto ? (
              <span className={cn('text-[10px]', progMismatch ? 'text-accent font-semibold' : 'text-text-3')}>AI推算 {autoProg}%</span>
            ) : (
              <span className="text-[10px] text-text-3/50">无关联任务</span>
            )}
          </div>
          <div className="space-y-1">
            {g.key_results.map((kr, i) => {
              const krItem = typeof kr === 'string' ? null : kr as KeyResultItem;
              return (
                <div key={i} className="flex items-center gap-2 text-xs text-text-3">
                  <CheckCircle2 size={12} className={i < Math.ceil(g.progress / 40) ? 'text-success' : 'text-border'} />
                  <span className="flex-1">{safeStr(kr)}</span>
                  {krItem && (krItem.targetValue != null || krItem.currentValue != null) && (
                    <span className="text-[10px] text-text-3 shrink-0">
                      {krItem.currentValue ?? 0}/{krItem.targetValue ?? '-'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        );
      })}

      <Modal open={goalModal.open} onClose={goalModal.closeModal} title="编辑目标"
        footer={
          <div className="flex gap-2">
            <button className={btnSecondary} onClick={goalModal.closeModal}>取消</button>
            <button className={btnPrimary} onClick={handleEditGoalSave}>保存</button>
          </div>
        }>
        {editGoalData && (
          <div>
            <ModalField label="目标标题">
              <input className={inputCls} value={editGoalData.title} onChange={(e) => setEditGoalData((p) => p ? { ...p, title: e.target.value } : null)} />
            </ModalField>
            <ModalField label="状态">
              <select className={inputCls} value={editGoalData.status} onChange={(e) => setEditGoalData((p) => p ? { ...p, status: e.target.value } : null)}>
                <option value="on_track">正常</option>
                <option value="at_risk">风险</option>
              </select>
            </ModalField>
            <ModalField label={`进度 (${editGoalData.progress}%)`}>
              <input type="range" min="0" max="100" value={editGoalData.progress} className="w-full accent-primary" onChange={(e) => setEditGoalData((p) => p ? { ...p, progress: Number(e.target.value) } : null)} />
            </ModalField>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-text-3">关键结果</div>
            {editGoalData.key_results.map((kr, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <input className={inputCls} value={kr} placeholder={`KR ${i + 1}`} onChange={(e) => handleKrTextChange(i, e.target.value)} />
                <button className="shrink-0 text-[10px] text-danger hover:text-danger/80" onClick={() => handleRemoveKr(i)}>删除</button>
              </div>
            ))}
            <button className={btnSecondary} onClick={handleAddKr}>+ 添加关键结果</button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function TasksContent() {
  const { tasks, loading, editTask } = useTasks();
  const { triggerFeedback } = useMLOOFeedback();
  const editModal = useModal();
  const [editData, setEditData] = useState<Record<string, unknown> | null>(null);
  const priorityStyle: Record<string, string> = { urgent: 'bg-danger/10 text-danger', high: 'bg-warn/10 text-warn', medium: 'bg-primary/10 text-primary-2', low: 'bg-surface-2 text-text-3' };
  const priorityLabel: Record<string, string> = { urgent: '紧急', high: '高', medium: '中', low: '低' };

  const taskFields: FieldDef[] = [
    { key: 'title', label: '任务标题', type: 'text' },
    { key: 'priority', label: '优先级', type: 'select', options: [{ value: 'high', label: '高' }, { value: 'medium', label: '中' }, { value: 'low', label: '低' }] },
    { key: 'status', label: '状态', type: 'select', options: [{ value: 'todo', label: '待办' }, { value: 'in_progress', label: '进行中' }, { value: 'done', label: '已完成' }, { value: 'blocked', label: '阻塞' }, { value: 'cancelled', label: '已取消' }] },
    { key: 'due_date', label: '截止日期', type: 'date' },
    { key: 'assignee_id', label: '负责人', type: 'text' },
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

  const handleToggleDone = useCallback((e: React.MouseEvent, t: typeof tasks[number]) => {
    e.stopPropagation();
    const newStatus = t.done ? 'todo' : 'done';
    editTask(t.id, { status: newStatus });
    triggerFeedback({ type: 'task_status', action: 'toggled', entity: { id: t.id, title: t.title, status: newStatus, goal_id: t.goal_id } });
  }, [editTask, triggerFeedback]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 size={18} className="text-primary-2" />
        <span className="text-sm font-bold">任务中心</span>
        <span className="ml-auto text-[10px] text-text-3">{tasks.length} 项 · {tasks.filter(t => t.done).length} 完成 · {tasks.filter(t => !t.done).length} 进行中</span>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin text-primary-2" /></div>
      ) : tasks.map((t) => (
        <div key={t.id} className={cn('flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-all hover:border-border-2 cursor-pointer', t.done && 'opacity-50')} onClick={() => handleTaskClick(t)}>
          <div className={cn('h-4 w-4 rounded border-2 shrink-0 flex items-center justify-center', t.done ? 'bg-success border-success' : 'border-border')} onClick={(e) => handleToggleDone(e, t)}>
            {t.done && <CheckCircle2 size={12} className="text-white" />}
          </div>
          <span className={cn('flex-1 text-xs text-text', t.done && 'line-through')}>{t.title}</span>
          <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold', priorityStyle[t.priority] || priorityStyle.medium)}>{priorityLabel[t.priority] || t.priority}</span>
            <span className="text-[10px] text-text-3 shrink-0">{t.due_date}</span>
        </div>
      ))}
      <ItemDetailModal open={editModal.open} onClose={editModal.closeModal} title="编辑任务" fields={taskFields} data={editData} onSave={handleTaskSave} />
    </div>
  );
}

function ProjectsContent() {
  const { projects, loading, addProject, editProject } = useProjects();
  const modal = useModal();
  const editModal = useModal();
  const [form, setForm] = useState({ title: '', status: 'planned', end_date: '', members: 0 });
  const [editData, setEditData] = useState<Record<string, unknown> | null>(null);

  const projectFields: FieldDef[] = [
    { key: 'title', label: '项目名称', type: 'text' },
    { key: 'status', label: '状态', type: 'select', options: [{ value: 'todo', label: '待办' }, { value: 'in_progress', label: '进行中' }, { value: 'done', label: '已完成' }] },
    { key: 'progress', label: '进度', type: 'number' },
    { key: 'end_date', label: '截止日期', type: 'date' },
  ];

  const handleOpen = useCallback(() => {
    setForm({ title: '', status: 'planned', end_date: '', members: 0 });
    modal.openModal();
  }, [modal.openModal]);

  const handleSave = useCallback(() => {
    if (!form.title.trim()) return;
    addProject({
      title: form.title,
      status: form.status,
      end_date: form.end_date || '待定',
      progress: 0,
      member_ids: [],
    });
    modal.closeModal();
  }, [form, addProject, modal.closeModal]);

  const handleProjectClick = useCallback((p: typeof projects[number]) => {
    setEditData({ id: p.id, title: p.title, status: p.status, progress: p.progress, end_date: p.end_date ?? '' });
    editModal.openModal();
  }, [editModal.openModal]);

  const handleProjectSave = useCallback((updated: Record<string, unknown>) => {
    editProject(String(updated.id), {
      title: String(updated.title),
      status: String(updated.status),
      progress: Number(updated.progress),
      end_date: updated.end_date ? String(updated.end_date) : null,
    });
  }, [editProject]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <FolderKanban size={18} className="text-primary-2" />
        <span className="text-sm font-bold">项目管理</span>
        <button className="ml-auto rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 transition-all hover:bg-primary/20" onClick={handleOpen}>+ 新建项目</button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin text-primary-2" /></div>
      ) : projects.map((p) => (
        <div key={p.id} className="rounded-xl border border-border bg-surface p-4 transition-all hover:border-border-2 hover:shadow-lg cursor-pointer" onClick={() => handleProjectClick(p)}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-text">{p.title}</span>
            <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold', p.status === 'active' ? 'bg-success/10 text-success' : 'bg-warn/10 text-warn')}>
              {p.status === 'active' ? '进行中' : p.status === 'planned' ? '计划中' : '评审中'}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-2 mb-2 overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${p.progress}%` }} />
          </div>
          <div className="flex items-center justify-between text-[10px] text-text-3">
             <span>{p.member_ids?.length ?? 0} 人</span>
             <span>截止 {p.end_date}</span>
          </div>
        </div>
      ))}

      <Modal open={modal.open} onClose={modal.closeModal} title="新建项目"
        footer={
          <div className="flex gap-2">
            <button className={btnSecondary} onClick={modal.closeModal}>取消</button>
            <button className={btnPrimary} onClick={handleSave} disabled={!form.title.trim()}>创建</button>
          </div>
        }>
        <ModalField label="项目名称">
          <input className={inputCls} placeholder="输入项目名称" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
        </ModalField>
        <ModalField label="状态">
          <select className={inputCls} value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
            <option value="planned">计划中</option>
            <option value="active">进行中</option>
            <option value="review">评审中</option>
          </select>
        </ModalField>
        <ModalField label="截止日期">
          <input type="date" className={inputCls} value={form.end_date} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} />
        </ModalField>
        <ModalField label="成员人数">
          <input type="number" className={inputCls} min="1" value={form.members || ''} placeholder="0" onChange={(e) => setForm((p) => ({ ...p, members: Number(e.target.value) || 0 }))} />
        </ModalField>
      </Modal>

      <ItemDetailModal open={editModal.open} onClose={editModal.closeModal} title="编辑项目" fields={projectFields} data={editData} onSave={handleProjectSave} />
    </div>
  );
}

function KnowledgeContent() {
  const { docs, loading, addDoc, editDoc } = useKnowledgeDocs();
  const modal = useModal();
  const editModal = useModal();
  const [form, setForm] = useState({ title: '', content: '', tags: '', color: '#7b6cf0' });
  const [editData, setEditData] = useState<Record<string, unknown> | null>(null);

  const docFields: FieldDef[] = [
    { key: 'title', label: '标题', type: 'text' },
    { key: 'content', label: '内容', type: 'textarea' },
    { key: 'tags', label: '标签（逗号分隔）', type: 'text' },
    { key: 'color', label: '颜色', type: 'text' },
  ];

  const handleOpen = useCallback(() => {
    setForm({ title: '', content: '', tags: '', color: '#7b6cf0' });
    modal.openModal();
  }, [modal.openModal]);

  const handleSave = useCallback(() => {
    if (!form.title.trim()) return;
    addDoc({
      title: form.title,
      content: form.content,
      tags: form.tags ? form.tags.split(/[,，]/).map((s: string) => s.trim()).filter(Boolean) : [],
      color: form.color,
      member_id: null,
      related_items: [],
    });
    modal.closeModal();
  }, [form, addDoc, modal.closeModal]);

  const handleDocClick = useCallback((d: typeof docs[number]) => {
    setEditData({ id: d.id, title: d.title, content: d.content, tags: d.tags?.join(', ') ?? '', color: d.color ?? '' });
    editModal.openModal();
  }, [editModal.openModal]);

  const handleDocSave = useCallback((updated: Record<string, unknown>) => {
    const tagsStr = String(updated.tags ?? '');
    editDoc(String(updated.id), {
      title: String(updated.title),
      content: String(updated.content),
      tags: tagsStr ? tagsStr.split(/[,，]/).map((s: string) => s.trim()).filter(Boolean) : [],
      color: String(updated.color),
    });
  }, [editDoc]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <BookOpen size={18} className="text-primary-2" />
        <span className="text-sm font-bold">知识库</span>
        <button className="ml-auto rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 transition-all hover:bg-primary/20" onClick={handleOpen}>+ 新建</button>
      </div>
      <div className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 mb-3">
        <BarChart3 size={14} className="text-text-3" />
        <span className="text-xs text-text-3">搜索知识库...</span>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin text-primary-2" /></div>
      ) : docs.map((d) => (
        <div key={d.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-all hover:border-border-2 hover:shadow-lg cursor-pointer" onClick={() => handleDocClick(d)}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0"><BookOpen size={14} className="text-primary-2" /></div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-text truncate">{d.title}</div>
            <div className="text-[10px] text-text-3">{d.tags?.length ? d.tags.slice(0, 3).join(', ') : '无标签'} · {d.updated_at?.slice(0, 10) ?? ''}</div>
          </div>
        </div>
      ))}

      <Modal open={modal.open} onClose={modal.closeModal} title="新建知识文档"
        footer={
          <div className="flex gap-2">
            <button className={btnSecondary} onClick={modal.closeModal}>取消</button>
            <button className={btnPrimary} onClick={handleSave} disabled={!form.title.trim()}>创建</button>
          </div>
        }>
        <ModalField label="标题">
          <input className={inputCls} placeholder="输入文档标题" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
        </ModalField>
        <ModalField label="内容">
          <textarea className={inputCls + ' min-h-[60px]'} placeholder="输入文档内容" value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} />
        </ModalField>
        <ModalField label="标签">
          <input className={inputCls} placeholder="用逗号分隔标签" value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} />
        </ModalField>
      </Modal>

      <ItemDetailModal open={editModal.open} onClose={editModal.closeModal} title="编辑知识文档" fields={docFields} data={editData} onSave={handleDocSave} />
    </div>
  );
}

const WORKSPACE_MODULES: Record<string, React.FC> = {
  overview: OverviewContent,
  goals: GoalsContent,
  tasks: TasksContent,
  projects: ProjectsContent,
  knowledge: KnowledgeContent,
  schedule: ScheduleContent,
  notifications: NotificationsContent,
  insight: InsightContent,
  reports: ReportsContent,
  prediction: PredictionContent,
  docs: DocsContent,
  experience: ExperienceContent,
  members: MembersContent,
  roles: RolesContent,
  org: OrgContent,
  admin: AdminContent,
  review: ReviewContent,
  alignment: PenetrationView,
};

export default function Workspace() {
  const activeModule = useAppStore((s) => s.activeModule);
  const setActiveModule = useAppStore((s) => s.setActiveModule);
  const iface = useAppStore((s) => s.interface);
  const setDeviationAlertCount = useAppStore((s) => s.setDeviationAlertCount);
  const { goals, loading: goalsLoading } = useGoals();
  const { projects, loading: projectsLoading } = useProjects();

  // Auto-detect deviation alerts whenever goals/projects change
  useEffect(() => {
    if (goalsLoading || projectsLoading) return;
    const items = [
      ...goals.map((g) => ({
        id: g.id, title: g.title, progress: g.progress,
        startDate: g.start_date, endDate: g.end_date, type: 'goal' as const,
      })),
      ...projects.map((p) => ({
        id: p.id, title: p.title, progress: p.progress,
        startDate: null as string | null, endDate: p.end_date, type: 'project' as const,
      })),
    ];
    const alerts = detectDeviations(items);
    setDeviationAlertCount(alerts.length);
  }, [goals, projects, goalsLoading, projectsLoading, setDeviationAlertCount]);

  const Content = WORKSPACE_MODULES[activeModule];
  if (Content) return <Content />;
  return <ModulePageStub title={activeModule} icon='🚧' description='此模块正在开发中' />;
}
