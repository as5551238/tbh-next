import { useState } from 'react';
import { useDocs, useMatrixCell } from '@/hooks/useMatrix';
import { cn } from '@/lib/utils';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { useToast, ToastOverlay } from '@/hooks/useToast';
import ItemDetailModal from '@/components/ItemDetailModal';
import { FileText, Plus, Clock, Users, MoreHorizontal } from 'lucide-react';
import { CardSkeleton } from '@/components/Skeleton';
import { t } from '@/lib/i18nCore';

/** Lazy i18n status config — same pattern as ActivitiesContent */
const STATUS_CFG: Record<string, { label: () => string; cls: string }> = {
  editing: { label: () => t('docs.statusEditing'), cls: 'bg-success/10 text-success' },
  review: { label: () => t('docs.statusReview'), cls: 'bg-warn/10 text-warn' },
  draft: { label: () => t('docs.statusDraft'), cls: 'bg-surface-2 text-text-3' },
  published: { label: () => t('docs.statusPublished'), cls: 'bg-primary/10 text-primary-2' },
};

const FILTERS = ['filterAll', 'filterEditing', 'filterReview', 'filterDraft', 'filterPublished'] as const;

const TYPE_OPTIONS: Record<string, () => string> = {
  doc: () => t('docs.typeDoc'),
  sheet: () => t('docs.typeSheet'),
  slide: () => t('docs.typeSlide'),
  other: () => t('docs.typeOther'),
};

export default function DocsContent() {
  const { cell, loading: cellLoading } = useMatrixCell();
  const { docs, addDoc, editDoc, removeDoc, loading } = useDocs();

  const createModal = useModal();
  const editModal = useModal();
  const { toasts, success, error: toastError } = useToast();
  const [selectedDoc, setSelectedDoc] = useState<(typeof docs)[number] | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('doc');

  const [statusFilterKey, setStatusFilterKey] = useState<string>('filterAll');

  async function handleCreate() {
    if (!newTitle.trim()) return;
    const row = await addDoc({
      title: newTitle.trim(),
      type: newType,
      status: 'draft',
      updated: new Date().toLocaleDateString('zh-CN'),
      editors: 0,
    });
    success(t('docs.toastCreated', { title: row.title }));
    setNewTitle('');
    setNewType('doc');
    createModal.closeModal();
  }

  if (loading) {
    return (
      <CardSkeleton />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
      <ToastOverlay toasts={toasts} />
      <div className="flex flex-wrap items-center gap-2">
        <FileText size={18} className="text-primary-2" />
        <span className="text-sm font-bold">{t('docs.title')}</span>
        <button onClick={() => { createModal.openModal(); }} className="ml-auto flex flex-wrap items-center gap-1 rounded-lg bg-primary px-3 py-1 text-[11px] font-semibold text-white transition-all hover:bg-primary-2">
          <Plus size={12} />
          {t('docs.createDoc')}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((fk) => (
          <button key={fk} onClick={() => setStatusFilterKey(fk)}
            className={`rounded-lg px-3 py-1 text-[11px] font-medium transition-all ${statusFilterKey === fk ? 'bg-primary/10 text-primary-2' : 'text-text-3 hover:bg-surface-2'}`}>
            {t(`docs.${fk}`)}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {docs.map((d) => {
          const st = STATUS_CFG[d.status];
          return (
            <div key={d.id} className="group flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-all hover:border-border-2 hover:shadow-lg cursor-pointer" onClick={() => { setSelectedDoc(d); editModal.openModal(); }}>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <FileText size={15} className="text-primary-2" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-text truncate">{d.title}</div>
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-text-3 mt-0.5">
                  <span>{TYPE_OPTIONS[d.type] ? TYPE_OPTIONS[d.type]() : d.type}</span>
                  <span>·</span>
                  <Clock size={9} />
                  <span>{d.updated}</span>
                  {d.editors > 0 && (
                    <>
                      <span>·</span>
                      <Users size={9} />
                      <span>{t('docs.editorsCount', { count: d.editors })}</span>
                    </>
                  )}
                </div>
              </div>
              {st && <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold', st.cls)}>{st.label()}</span>}
              <button onClick={(e) => { e.stopPropagation(); setSelectedDoc(d); editModal.openModal(); }} aria-label={t('docs.editDoc')} className="opacity-0 group-hover:opacity-100 transition-opacity text-text-3 hover:text-text">
                <MoreHorizontal size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <Modal open={createModal.open} onClose={createModal.closeModal} title={t('docs.createModalTitle')}
        footer={
          <>
            <button onClick={createModal.closeModal} className={btnSecondary}>{t('docs.cancel')}</button>
            <button onClick={handleCreate} className={btnPrimary} disabled={!newTitle.trim()}>{t('docs.create')}</button>
          </>
        }>
        <ModalField label={t('docs.docTitle')}>
          <input className={inputCls} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder={t('docs.docTitlePlaceholder')} />
        </ModalField>
        <ModalField label={t('docs.docType')}>
          <select className={inputCls} value={newType} onChange={(e) => setNewType(e.target.value)}>
            <option value="doc">{t('docs.typeDoc')}</option>
            <option value="sheet">{t('docs.typeSheet')}</option>
            <option value="slide">{t('docs.typeSlide')}</option>
            <option value="other">{t('docs.typeOther')}</option>
          </select>
        </ModalField>
      </Modal>

      <ItemDetailModal
        open={editModal.open}
        onClose={editModal.closeModal}
        title={t('docs.editModalTitle')}
        fields={[
          { key: 'title', label: t('docs.fieldTitle'), type: 'text' },
          { key: 'type', label: t('docs.fieldType'), type: 'select', options: [
            { value: 'doc', label: t('docs.typeDoc') }, { value: 'sheet', label: t('docs.typeSheet') }, { value: 'slide', label: t('docs.typeSlide') },
          ]},
          { key: 'status', label: t('docs.fieldStatus'), type: 'select', options: [
            { value: 'editing', label: t('docs.statusEditing') }, { value: 'review', label: t('docs.statusReview') }, { value: 'draft', label: t('docs.statusDraft') }, { value: 'published', label: t('docs.statusPublished') },
          ]},
          { key: 'content', label: t('docs.fieldContent'), type: 'textarea' },
        ]}
        data={selectedDoc as Record<string, unknown> | null}
        commentTarget={selectedDoc?.id ? { type: 'doc', id: String(selectedDoc.id) } : null}
        onSave={(updated) => {
          const id = updated.id as string;
          editDoc(id, updated);
        }}
        onDelete={() => {
          if (selectedDoc) removeDoc(selectedDoc.id);
        }}
      />
    </div>
  );
}
