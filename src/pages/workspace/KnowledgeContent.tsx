import { useState, useCallback, useMemo } from 'react';
import { useKnowledgeDocs } from '@/hooks/useMatrix';
import { cn } from '@/lib/utils';
import { BookOpen, BarChart3 } from 'lucide-react';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import ItemDetailModal, { type FieldDef } from '@/components/ItemDetailModal';
import { CardSkeleton } from '@/components/Skeleton';
import { trackEvent } from '@/lib/behaviorTracker';
import { useLocale } from '@/lib/i18n';

export default function KnowledgeContent() {
  const { t } = useLocale();
  const { docs, loading, addDoc, editDoc, removeDoc } = useKnowledgeDocs();
  const modal = useModal();
  const editModal = useModal();
  const [form, setForm] = useState({ title: '', content: '', tags: '', color: 'var(--brand-accent)' });
  const [editData, setEditData] = useState<Record<string, unknown> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return docs;
    const q = searchQuery.toLowerCase();
    return docs.filter((d) =>
      d.title?.toLowerCase().includes(q) ||
      d.content?.toLowerCase().includes(q) ||
      (Array.isArray(d.tags) && d.tags.some((t: string) => t?.toLowerCase().includes(q)))
    );
  }, [docs, searchQuery]);

  const docFields: FieldDef[] = [
    { key: 'title', label: t('knowledge.titleLabel'), type: 'text' },
    { key: 'content', label: t('knowledge.contentLabel'), type: 'textarea' },
    { key: 'tags', label: t('knowledge.tagsLabel'), type: 'text' },
    { key: 'color', label: t('tags.color'), type: 'text' },
  ];

  const handleOpen = useCallback(() => {
    setForm({ title: '', content: '', tags: '', color: 'var(--brand-accent)' });
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
    trackEvent('doc_create', { title: form.title });
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
    trackEvent('doc_update', { id: updated.id });
  }, [editDoc]);

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <BookOpen size={18} className="text-primary-2" />
        <span className="text-sm font-bold">{t('knowledge.title')}</span>
        <button className="ml-auto rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 transition-all hover:bg-primary/20" onClick={handleOpen}>{t('knowledge.newDoc')}</button>
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 mb-3">
        <BarChart3 size={14} className="text-text-3" />
        <input
          className="bg-transparent text-xs text-text outline-none flex-1 placeholder-text-3"
          placeholder={t('knowledge.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="text-text-3 hover:text-text text-xs" onClick={() => setSearchQuery('')}>✕</button>
        )}
      </div>
      {loading ? (
        <CardSkeleton />
      ) : filteredDocs.length === 0 ? (
        <div className="text-center py-8 text-text-3 text-xs">{searchQuery ? t('knowledge.noMatch') : t('knowledge.noDocs')}</div>
      ) : filteredDocs.map((d) => (
        <div key={d.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-all hover:border-border-2 hover:shadow-lg cursor-pointer" onClick={() => handleDocClick(d)}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0"><BookOpen size={14} className="text-primary-2" /></div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-text truncate">{d.title}</div>
            <div className="text-[10px] text-text-3">{d.tags?.length ? d.tags.slice(0, 3).join(', ') : t('knowledge.noTags')} · {d.updated_at?.slice(0, 10) ?? ''}</div>
          </div>
        </div>
      ))}

      <Modal open={modal.open} onClose={modal.closeModal} title={t('knowledge.newDocTitle')}
        footer={
          <div className="flex flex-wrap gap-2">
            <button className={btnSecondary} onClick={modal.closeModal}>{t('common.cancel')}</button>
            <button className={btnPrimary} onClick={handleSave} disabled={!form.title.trim()}>{t('common.create')}</button>
          </div>
        }>
        <ModalField label={t('knowledge.titleLabel')}>
          <input className={inputCls} placeholder={t('knowledge.titlePlaceholder')} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
        </ModalField>
        <ModalField label={t('knowledge.contentLabel')}>
          <textarea className={inputCls + ' min-h-[60px]'} placeholder={t('knowledge.contentPlaceholder')} value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} />
        </ModalField>
        <ModalField label={t('tags.color')}>
          <input className={inputCls} placeholder={t('knowledge.tagsPlaceholder')} value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} />
        </ModalField>
      </Modal>

      <ItemDetailModal open={editModal.open} onClose={editModal.closeModal} title={t('knowledge.editDocTitle')} fields={docFields} data={editData} onSave={handleDocSave} onDelete={editData?.id && !String(editData.id).startsWith('mock') ? () => { removeDoc(String(editData.id)); trackEvent('doc_delete', { id: editData.id }); editModal.closeModal(); } : undefined} commentTarget={editData?.id ? { type: 'knowledge_doc', id: String(editData.id) } : null} />
    </div>
  );
}
