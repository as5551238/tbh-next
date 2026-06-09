import { useGateCheck } from '@/hooks/useGateCheck';
import PaywallModal from '@/components/PaywallModal';
import { useState, useCallback } from 'react';
import { useProjects } from '@/hooks/useMatrix';
import { cn } from '@/lib/utils';
import { FolderKanban, Loader2 } from 'lucide-react';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import ItemDetailModal, { type FieldDef } from '@/components/ItemDetailModal';

export default function ProjectsContent() {
  const { projects, loading, addProject, editProject, removeProject } = useProjects();
  const { showPaywall: ppShow, paywallReason: ppReason, paywallFeature: ppFeat, closePaywall: ppClose, requireLimit: ppLimit } = useGateCheck();
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
    if (!ppLimit('maxProjects', projects.length, '免费版最多创建5个项目，升级Pro解锁更多')) return;
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

      <PaywallModal open={ppShow} onClose={ppClose} reason={ppReason} feature={ppFeat} />
      <ItemDetailModal open={editModal.open} onClose={editModal.closeModal} title="编辑项目" fields={projectFields} data={editData} onSave={handleProjectSave} onDelete={() => { if (editData?.id) { removeProject(String(editData.id)); editModal.closeModal(); } }} commentTarget={editData?.id ? { type: 'project', id: String(editData.id) } : null} />
    </div>
  );
}
