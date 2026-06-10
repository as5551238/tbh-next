import { useState } from 'react';
import { useIndustryColor, useAnnouncements } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { Pin, MessageSquare, Eye, X, Check } from 'lucide-react';
import { useModal, btnPrimary, btnSecondary, inputCls } from '@/components/Modal';
import ItemDetailModal from '@/components/ItemDetailModal';
import type { FieldDef } from '@/components/ItemDetailModal';
import type { AnnouncementRow } from '@/lib/dataLayer';
import { CardSkeleton } from '@/components/Skeleton';



const PRIORITY_STYLES: Record<string, string> = {
  top: 'bg-danger/10 text-danger',
  normal: 'bg-warn/10 text-warn',
  info: 'bg-primary/10 text-primary-2',
};

const ANN_FIELDS: FieldDef[] = [
  { key: 'title', label: '标题', type: 'text' },
  { key: 'content', label: '内容', type: 'textarea' },
  { key: 'priority', label: '优先级', type: 'select', options: [
    { value: 'top', label: '置顶' },
    { value: 'normal', label: '重要' },
    { value: 'info', label: '通知' },
  ]},
  { key: 'department', label: '部门', type: 'text' },
];

export default function AnnouncementsView() {
  const indColor = useIndustryColor();
  const { announcements, addAnnouncement, editAnnouncement, removeAnnouncement, loading } = useAnnouncements();
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);
  const detailModal = useModal();
  const createModal = useModal();
  const [selected, setSelected] = useState<AnnouncementRow | null>(null);
  const [form, setForm] = useState({ title: '', content: '', priority: 'info' as string, department: dept });

  async function handleCreate() {
    if (!form.title.trim() || !form.content.trim()) return;
    await addAnnouncement({
      title: form.title.trim(),
      content: form.content.trim(),
      priority: form.priority,
      pinned: form.priority === 'top',
      author: '我',
      department: form.department,
      views: 0,
      comments: 0,
      time: '刚刚',
    });
    setForm({ title: '', content: '', priority: 'info', department: dept });
    createModal.closeModal();
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <span className="text-sm font-bold">公告板</span>
        <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ backgroundColor: indColor + '20', color: indColor }}>{industry} · {dept}</span>
        <button onClick={createModal.openModal} className="ml-auto rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20 transition-colors">+ 发布公告</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">
        {loading ? (
          <CardSkeleton />
        ) : (
        announcements.map((ann) => (
          <div key={ann.id} className={cn('rounded-xl border border-border bg-surface p-4 transition-all hover:border-border-2 hover:shadow-lg cursor-pointer',
            ann.pinned && 'border-l-2 border-l-primary'
          )} onClick={() => { setSelected(ann); detailModal.openModal(); }}>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {ann.pinned && <Pin size={12} className="text-primary-2 shrink-0" />}
              <span className="text-sm font-semibold text-text">{ann.title}</span>
              <span className={cn('rounded-full px-1.5 py-0.5 text-[8px] font-bold', PRIORITY_STYLES[ann.priority])}>
                {ann.priority === 'top' ? '置顶' : ann.priority === 'normal' ? '重要' : '通知'}
              </span>
            </div>
            <p className="text-xs text-text-2 leading-relaxed mb-3">{ann.content}</p>
            <div className="flex items-center justify-between text-[10px] text-text-3">
              <span>{ann.author} · {ann.department}</span>
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex flex-wrap items-center gap-1"><Eye size={10} />{ann.views}</span>
                <span className="flex flex-wrap items-center gap-1"><MessageSquare size={10} />{ann.comments}</span>
                <span>{ann.time}</span>
              </div>
            </div>
          </div>
        ))
        )}
      </div>

      <ItemDetailModal open={detailModal.open} onClose={detailModal.closeModal} title="公告详情" fields={ANN_FIELDS} data={selected as unknown as Record<string, unknown> | null} commentTarget={selected?.id ? { type: 'announcement', id: String(selected.id) } : null} onSave={(updated) => { if (selected) { editAnnouncement(selected.id, updated); } }} onDelete={() => { if (selected) { removeAnnouncement(selected.id); detailModal.closeModal(); } }} />

      {/* Create Announcement Modal */}
      {createModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={createModal.closeModal}>
          <div className="w-96 rounded-xl border border-border bg-surface-2 p-3 md:p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold">发布公告</span>
              <button onClick={createModal.closeModal} aria-label="关闭" className="text-text-3 hover:text-text"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-text-3 mb-1 block">标题 *</label>
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="公告标题" className={inputCls + ' w-full'} />
              </div>
              <div>
                <label className="text-[10px] text-text-3 mb-1 block">内容 *</label>
                <textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} placeholder="公告内容" rows={4} className={inputCls + ' w-full resize-none'} />
              </div>
              <div>
                <label className="text-[10px] text-text-3 mb-1 block">优先级</label>
                <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} className={inputCls + ' w-full'}>
                  <option value="info">通知</option>
                  <option value="normal">重要</option>
                  <option value="top">置顶</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <button onClick={handleCreate} disabled={!form.title.trim() || !form.content.trim()} className={`${btnPrimary} disabled:opacity-40`}>发布</button>
              <button onClick={createModal.closeModal} className={btnSecondary}>取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
