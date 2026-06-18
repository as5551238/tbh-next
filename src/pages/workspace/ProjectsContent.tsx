import { CardSkeleton } from '@/components/Skeleton';
import { useGateCheck } from '@/hooks/useGateCheck';
import PaywallModal from '@/components/PaywallModal';
import { useState, useCallback } from 'react';
import { useProjects, useMembers } from '@/hooks/useMatrix';
import type { ProjectRow } from '@/lib/dataLayer';
import { cn } from '@/lib/utils';
import { FolderKanban, Plus, Sparkles, X, UserPlus } from 'lucide-react';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import ItemDetailModal, { type FieldDef } from '@/components/ItemDetailModal';
import PageHeader from '@/components/PageHeader';
import { exportToCSV, exportToJSON } from '@/lib/export';
import { usePermission } from '@/hooks/usePermission';
import { chatCompletion } from '@/lib/aiService';
import { trackEvent } from '@/lib/behaviorTracker';
import { useLocale } from '@/lib/i18n';

export default function ProjectsContent() {
  const { t } = useLocale();
  const { projects, loading, addProject, editProject, removeProject } = useProjects();
  const { members } = useMembers();
  const { showPaywall: ppShow, paywallReason: ppReason, paywallFeature: ppFeat, closePaywall: ppClose, requireLimit: ppLimit } = useGateCheck();
  const { can } = usePermission();
  const modal = useModal();
  const editModal = useModal();
  const memberModal = useModal();
  const [form, setForm] = useState({ title: '', status: 'todo', end_date: '', member_ids: [] as string[] });
  const [editData, setEditData] = useState<Record<string, unknown> | null>(null);
  const [editMemberIds, setEditMemberIds] = useState<string[]>([]);
  const [memberProjectId, setMemberProjectId] = useState<string | null>(null);
  const [memberProjectTitle, setMemberProjectTitle] = useState('');
  const [projExportOpen, setProjExportOpen] = useState(false);
  const [aiHealthInsight, setAiHealthInsight] = useState<string | null>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);

  const projectFields: FieldDef[] = [
    { key: 'title', label: t('projects.projectTitle'), type: 'text' },
    { key: 'status', label: t('projects.status'), type: 'select', options: [{ value: 'todo', label: t('projects.statusTodo') }, { value: 'in_progress', label: t('projects.statusInProgress') }, { value: 'done', label: t('projects.statusDone') }, { value: 'blocked', label: t('projects.statusBlocked') }, { value: 'cancelled', label: t('projects.statusCancelled') }] },
    { key: 'progress', label: t('projects.progressLabel'), type: 'number' },
    { key: 'end_date', label: t('projects.endDate'), type: 'date' },
  ];

  const handleOpen = useCallback(() => {
    if (!ppLimit('maxProjects', projects.length, t('projects.paywallMsg'))) return;
    setForm({ title: '', status: 'todo', end_date: '', member_ids: [] });
    modal.openModal();
  }, [modal.openModal]);

  const handleSave = useCallback(() => {
    if (!form.title.trim()) return;
    addProject({
      title: form.title,
      status: form.status,
      end_date: form.end_date || null,
      progress: 0,
      member_ids: form.member_ids,
      task_count: 0,
      goal_id: null,
    } as Omit<ProjectRow, 'id'>);
    trackEvent('project_create', { title: form.title, status: form.status });
    modal.closeModal();
  }, [form, addProject, modal.closeModal]);

  const handleProjectClick = useCallback((p: typeof projects[number]) => {
    setEditData({ id: p.id, title: p.title, status: p.status, progress: p.progress, end_date: p.end_date ?? '' });
    setEditMemberIds(p.member_ids ?? []);
    editModal.openModal();
  }, [editModal.openModal]);

  const handleProjectSave = useCallback((updated: Record<string, unknown>) => {
    const projectId = String(updated.id);
    const currentProject = projects.find((p) => p.id === projectId);
    editProject(projectId, {
      title: String(updated.title),
      status: String(updated.status),
      progress: Number(updated.progress),
      end_date: updated.end_date ? String(updated.end_date) : null,
      member_ids: editMemberIds,
      goal_id: currentProject?.goal_id ?? null,
    });
    trackEvent('project_update', { id: updated.id, status: updated.status });
  }, [editProject, editMemberIds, projects]);

  const handleOpenMemberModal = useCallback((p: typeof projects[number], e: React.MouseEvent) => {
    e.stopPropagation();
    setMemberProjectId(p.id);
    setMemberProjectTitle(p.title);
    setEditMemberIds(p.member_ids ?? []);
    memberModal.openModal();
  }, [memberModal.openModal]);

  const handleRemoveMember = useCallback((mid: string) => {
    setEditMemberIds((prev) => {
      const newIds = prev.filter((id) => id !== mid);
      if (memberProjectId) editProject(memberProjectId, { member_ids: newIds });
      return newIds;
    });
  }, [memberProjectId, editProject]);

  const projExportHeaders = [t('projects.expName'), t('projects.expDesc'), t('projects.expStatus'), t('projects.expProgress'), t('projects.expOwner'), t('projects.expStartDate'), t('projects.expEndDate')];
  const handleExportProjectsCSV = useCallback(() => {
    const rows = projects.map((p) => ({ [t('projects.expName')]: String(p.title ?? ''), [t('projects.expDesc')]: '', [t('projects.expStatus')]: String(p.status ?? ''), [t('projects.expProgress')]: String(p.progress ?? ''), [t('projects.expOwner')]: '', [t('projects.expStartDate')]: String(p.start_date ?? ''), [t('projects.expEndDate')]: String(p.end_date ?? '') }));
    exportToCSV(projExportHeaders, rows, 'projects');
  }, [projects]);
  const handleExportProjectsJSON = useCallback(() => {
    const rows = projects.map((p) => ({ [t('projects.expName')]: String(p.title ?? ''), [t('projects.expDesc')]: '', [t('projects.expStatus')]: String(p.status ?? ''), [t('projects.expProgress')]: String(p.progress ?? ''), [t('projects.expOwner')]: '', [t('projects.expStartDate')]: String(p.start_date ?? ''), [t('projects.expEndDate')]: String(p.end_date ?? '') }));
    exportToJSON(rows, 'projects');
  }, [projects]);

  const handleAiHealthCheck = useCallback(async () => {
    if (aiAnalyzing || projects.length === 0) return;
    setAiAnalyzing(true);
    setAiHealthInsight(null);
    try {
      const summary = projects.map((p) => `${t('projects.aiSummaryEntry', { title: p.title, status: p.status, progress: p.progress, endDate: p.end_date ?? t('projects.notSet') })}`).join('\n');
      const res = await chatCompletion([{ role: 'user', content: t('projects.aiSummaryPrompt', { summary }) }]);
      setAiHealthInsight(res?.text ?? t('projects.aiNoSuggestion'));
    } catch {
      setAiHealthInsight(t('projects.aiUnavailable'));
    } finally {
      setAiAnalyzing(false);
    }
  }, [projects, aiAnalyzing]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader icon={<FolderKanban size={16} />} title={t('projects.title')} badge={t('projects.projectCount', { count: projects.length })}>
        {can('ai:chat') && (
        <button className="flex items-center gap-1 rounded-lg bg-accent/10 px-3 py-1 text-[11px] font-semibold text-accent hover:bg-accent/20 disabled:opacity-50" onClick={handleAiHealthCheck} disabled={aiAnalyzing}><Sparkles size={12} />{aiAnalyzing ? t('projects.analyzing') : t('projects.aiHealthCheck')}</button>
        )}
        {can('projects:write') && (
        <button className="rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 transition-all hover:bg-primary/20" onClick={handleOpen}><Plus size={12} className="mr-1 inline" />{t('projects.newProject')}</button>
        )}
        {can('reports:export') && (
        <div className="relative">
          <button className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-text-3 hover:text-text-2" onClick={() => setProjExportOpen((v) => !v)}>{t('projects.exportBtn')}</button>
          {projExportOpen && (<>
            <div className="fixed inset-0 z-40" onClick={() => setProjExportOpen(false)} />
            <div className="absolute right-0 top-full z-50 mt-1 min-w-[100px] rounded-lg border border-border bg-surface py-1 shadow-lg">
              <button className="w-full px-3 py-1.5 text-left text-xs text-text-3 hover:bg-surface-2 hover:text-text-2" onClick={() => { setProjExportOpen(false); handleExportProjectsCSV(); }}>{t('projects.exportCSV')}</button>
              <button className="w-full px-3 py-1.5 text-left text-xs text-text-3 hover:bg-surface-2 hover:text-text-2" onClick={() => { setProjExportOpen(false); handleExportProjectsJSON(); }}>{t('projects.exportJSON')}</button>
            </div>
          </>)}
        </div>
        )}
      </PageHeader>
      {aiHealthInsight && (
        <div className="mx-3 md:mx-4 mt-2 rounded-lg border border-accent/20 bg-accent/5 p-3 text-xs text-text-2">
          <div className="flex items-start justify-between gap-2">
            <Sparkles size={12} className="mt-0.5 shrink-0 text-accent" />
            <span className="flex-1 whitespace-pre-wrap">{aiHealthInsight}</span>
          </div>
          <button className="mt-1 text-[9px] text-text-3 hover:text-text" onClick={() => setAiHealthInsight(null)}>{t('projects.close')}</button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">
      {loading ? (
        <CardSkeleton />
      ) : projects.map((p) => (
        <div key={p.id} className="rounded-xl border border-border bg-surface p-3 md:p-4 transition-all hover:border-border-2 hover:shadow-lg cursor-pointer" onClick={() => handleProjectClick(p)}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-text">{p.title}</span>
            <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold', p.status === 'in_progress' ? 'bg-success/10 text-success' : p.status === 'done' ? 'bg-primary/10 text-primary' : p.status === 'blocked' ? 'bg-danger/10 text-danger' : p.status === 'cancelled' ? 'bg-text-3/10 text-text-3' : 'bg-warn/10 text-warn')}>
              {p.status === 'in_progress' ? t('projects.statusInProgress') : p.status === 'done' ? t('projects.statusDone') : p.status === 'blocked' ? t('projects.statusBlocked') : p.status === 'cancelled' ? t('projects.statusCancelled') : t('projects.statusTodo')}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-2 mb-2 overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${p.progress}%` }} />
          </div>
          <div className="flex items-center justify-between text-[10px] text-text-3">
             <button className="flex items-center gap-0.5 hover:text-primary-2 transition-colors" onClick={(e) => handleOpenMemberModal(p, e)}><UserPlus size={10} />{t('projects.memberCount', { count: p.member_ids?.length ?? 0 })}</button>
             <span>{t('projects.dueLabel', { date: p.end_date ?? '' })}</span>
          </div>
        </div>
      ))}

      <Modal open={modal.open} onClose={modal.closeModal} title={t('projects.newProject')}
        footer={
          <div className="flex flex-wrap gap-2">
            <button className={btnSecondary} onClick={modal.closeModal}>{t('common.cancel')}</button>
            <button className={btnPrimary} onClick={handleSave} disabled={!form.title.trim()}>{t('common.create')}</button>
          </div>
        }>
        <ModalField label={t('projects.projectTitle')}>
          <input className={inputCls} placeholder={t('projects.projectTitlePlaceholder')} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
        </ModalField>
        <ModalField label={t('projects.status')}>
          <select className={inputCls} value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
            <option value="todo">{t('projects.statusTodo')}</option>
            <option value="in_progress">{t('projects.statusInProgress')}</option>
            <option value="done">{t('projects.statusDone')}</option>
            <option value="blocked">{t('projects.statusBlocked')}</option>
            <option value="cancelled">{t('projects.statusCancelled')}</option>
          </select>
        </ModalField>
        <ModalField label={t('projects.endDate')}>
          <input type="date" className={inputCls} value={form.end_date} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} />
        </ModalField>
        <div className="mb-3">
          <div className="text-[11px] font-medium text-text-3 mb-1">{t('projects.projectMembers')}</div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {form.member_ids.map((mid) => {
              const m = members.find((x) => x.id === mid);
              return (
                <span key={mid} className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary-2">
                  {m?.name ?? mid.slice(0, 8)}
                  <button onClick={() => setForm((p) => ({ ...p, member_ids: p.member_ids.filter((id) => id !== mid) }))}><X size={9} className="hover:text-danger" /></button>
                </span>
              );
            })}
          </div>
          <select className={inputCls} value="" onChange={(e) => { if (e.target.value && !form.member_ids.includes(e.target.value)) setForm((p) => ({ ...p, member_ids: [...p.member_ids, e.target.value] })); }}>
            <option value="">{t('projects.addMember')}</option>
            {members.filter((m) => !form.member_ids.includes(m.id)).map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </Modal>

      <PaywallModal open={ppShow} onClose={ppClose} reason={ppReason} feature={ppFeat} />
      <ItemDetailModal open={editModal.open} onClose={editModal.closeModal} title={t('projects.editProject')} fields={projectFields} data={editData} onSave={handleProjectSave} onDelete={can('projects:delete') ? () => { if (editData?.id) { removeProject(String(editData.id)); trackEvent('project_delete', { id: editData.id }); editModal.closeModal(); } } : undefined} commentTarget={editData?.id ? { type: 'project', id: String(editData.id) } : null} />

      {/* Member management modal */}
      <Modal open={memberModal.open} onClose={memberModal.closeModal} title={t('projects.manageMembers', { title: memberProjectTitle })}
        footer={<button className={btnPrimary} onClick={memberModal.closeModal}>{t('projects.done')}</button>}>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {editMemberIds.map((mid) => {
            const m = members.find((x) => x.id === mid);
            return (
              <span key={mid} className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary-2">
                {m?.name ?? mid.slice(0, 8)}
                <button onClick={() => handleRemoveMember(mid)}><X size={9} className="hover:text-danger" /></button>
              </span>
            );
          })}
          {editMemberIds.length === 0 && <span className="text-[10px] text-text-3">{t('projects.noMembers')}</span>}
        </div>
        <select className={inputCls} value="" onChange={(e) => { if (e.target.value && !editMemberIds.includes(e.target.value)) { const newIds = [...editMemberIds, e.target.value]; setEditMemberIds(newIds); if (memberProjectId) editProject(memberProjectId, { member_ids: newIds }); } }}>
          <option value="">{t('projects.addMember')}</option>
          {members.filter((m) => !editMemberIds.includes(m.id)).map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </Modal>
      </div>
    </div>
  );
}
