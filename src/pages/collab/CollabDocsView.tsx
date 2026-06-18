import { useState, useCallback, useRef, useEffect, type FC } from 'react';
import { useCollabDocs } from '@/hooks/useMatrix';
import type { CollabDocRow } from '@/lib/dataLayer';
import { useAppStore } from '@/stores/appStore';
import { useAuth } from '@/lib/auth';
import { useRealtime, usePresence } from '@/hooks/useRealtime';
import { cn } from '@/lib/utils';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { FileText, FileSpreadsheet, FileImage, File, Clock, User, Edit3, Eye, X, Save, Users } from 'lucide-react';
import { useMLOOFeedback } from '@/hooks/useMLOOFeedback';
import { CardSkeleton } from '@/components/Skeleton';
import { useLocale } from '@/lib/i18n';

const TYPE_ICONS: Record<string, FC<{ size?: number; className?: string }>> = {
  doc: FileText,
  sheet: FileSpreadsheet,
  slide: FileImage,
  other: File,
};

const STATUS_STYLES: Record<string, string> = {
  editing: 'bg-success/10 text-success',
  review: 'bg-warn/10 text-warn',
  final: 'bg-primary/10 text-primary-2',
};

export default function CollabDocsView() {
  const { t } = useLocale();
  const { docs, addDoc, editDoc, removeDoc, loading } = useCollabDocs();
  const { triggerFeedback } = useMLOOFeedback();
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);
  const { user } = useAuth();

  const [activeDoc, setActiveDoc] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [coEditors, setCoEditors] = useState<{ user: string; online_at: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const createModal = useModal();
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('doc');

  useRealtime(
    'collab_docs',
    useCallback((payload) => {
      if (payload.new?.id === activeDoc && payload.new?.content) {
        setEditContent(payload.new.content as string);
      }
    }, [activeDoc]),
  );

  usePresence(
    `doc-${activeDoc ?? 'none'}`,
    user?.id ?? `anon-${Date.now()}`,
    useCallback((states) => {
      const editors: { user: string; online_at: string }[] = [];
      for (const stateArr of Object.values(states)) {
        if (Array.isArray(stateArr)) {
          for (const s of stateArr) {
            editors.push(s as { user: string; online_at: string });
          }
        }
      }
      setCoEditors(editors);
    }, []),
  );

  useEffect(() => {
    if (activeDoc) {
      const doc = docs.find((d) => d.id === activeDoc);
      if (doc) setEditContent((doc as unknown as Record<string, unknown>).content as string || `# ${doc.title}\n\n${t('collabDocs.editPlaceholder')}`);
    }
  }, [activeDoc, docs]);

  async function handleSave() {
    if (!activeDoc) return;
    setSaving(true);
    await editDoc(activeDoc, { last_edited: new Date().toLocaleDateString('zh-CN'), last_edited_by: user?.email ?? t('collabDocs.currentUser') } as Partial<CollabDocRow>);
    const doc = docs.find((d) => d.id === activeDoc);
    if (doc) triggerFeedback({ type: 'doc_status', action: 'saved', entity: doc as unknown as Record<string, unknown> });
    setSaving(false);
  }

  async function handleCreateDoc() {
    if (!newTitle.trim()) return;
    await addDoc({
      title: newTitle.trim(),
      type: newType,
      status: 'editing',
      last_edited: new Date().toLocaleDateString('zh-CN'),
      last_edited_by: user?.email ?? t('collabDocs.currentUser'),
      editors: 1,
      viewers: 0,
    } as Partial<CollabDocRow>);
    setNewTitle('');
    setNewType('doc');
    createModal.closeModal();
  }

  const activeDocData = docs.find((d) => d.id === activeDoc);

  if (activeDoc && activeDocData) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2.5">
          <button onClick={() => setActiveDoc(null)} aria-label={t('collabDocs.close')} className="flex h-7 w-7 items-center justify-center rounded-lg text-text-3 hover:bg-surface-2">
            <X size={14} />
          </button>
          <span className="text-sm font-bold">{activeDocData.title}</span>
          <span className={cn('rounded-full px-1.5 py-0.5 text-[8px] font-bold', STATUS_STYLES[activeDocData.status])}>
            {activeDocData.status === 'editing' ? t('collabDocs.statusEditing') : activeDocData.status === 'review' ? t('collabDocs.statusReview') : t('collabDocs.statusFinal')}
          </span>
          {coEditors.length > 0 && (
            <span className="flex flex-wrap items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[8px] font-bold text-success">
              <Users size={9} /> {t('collabDocs.collabCount', { count: coEditors.length + 1 })}
            </span>
          )}
          <button onClick={handleSave} className="ml-auto flex flex-wrap items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20 transition-colors disabled:opacity-50" disabled={saving}>
            <Save size={12} /> {saving ? t('collabDocs.saving') : t('collabDocs.save')}
          </button>
        </div>

        <div className="flex-1 overflow-hidden p-3 md:p-4">
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="h-full w-full resize-none bg-transparent text-sm text-text leading-relaxed outline-none font-mono"
            placeholder={t('collabDocs.contentPlaceholder')}
            aria-label={t('collabDocs.contentAriaLabel')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <span className="text-sm font-bold">{t('collabDocs.title')}</span>
        <span className="text-[10px] text-text-3">{t('collabDocs.docCount', { count: docs.length })}</span>
        <button onClick={createModal.openModal} className="ml-auto rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20 transition-colors">{t('collabDocs.newDoc')}</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2">
        {loading ? (
          <CardSkeleton />
        ) : (
        docs.map((doc) => {
          const Icon = TYPE_ICONS[doc.type] ?? File;
          return (
            <div key={doc.id} onClick={() => setActiveDoc(doc.id)} className="group rounded-xl border border-border bg-surface p-3 md:p-4 transition-all hover:border-primary/30 hover:shadow-lg cursor-pointer">
               <div className="flex flex-wrap items-center gap-3">
                 <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                   <Icon size={16} className="text-primary-2" />
                 </div>
                 <div className="min-w-0 flex-1">
                   <div className="flex flex-wrap items-center gap-2 mb-0.5">
                     <span className="text-xs font-semibold text-text truncate">{doc.title}</span>
                     <span className={cn('rounded-full px-1.5 py-0.5 text-[8px] font-bold shrink-0', STATUS_STYLES[doc.status])}>
                        {doc.status === 'editing' ? t('collabDocs.statusEditing') : doc.status === 'review' ? t('collabDocs.statusReview') : t('collabDocs.statusFinal')}
                     </span>
                   </div>
                   <div className="flex flex-wrap items-center gap-3 text-[10px] text-text-3">
                     <span className="flex flex-wrap items-center gap-1"><Clock size={9} />{doc.last_edited}</span>
                     <span className="flex flex-wrap items-center gap-1"><User size={9} />{doc.last_edited_by}</span>
                      <span className="flex flex-wrap items-center gap-1"><Edit3 size={9} />{t('collabDocs.editorsCount', { count: doc.editors })}</span>
                      <span className="flex flex-wrap items-center gap-1"><Eye size={9} />{t('collabDocs.viewersCount', { count: doc.viewers })}</span>
                   </div>
                 </div>
                 <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
                   {doc.status === 'editing' && (
                      <button onClick={() => editDoc(doc.id, { status: 'review' })} className="rounded bg-warn/10 px-2 py-0.5 text-[8px] font-semibold text-warn hover:bg-warn/20">{t('collabDocs.submitReview')}</button>
                   )}
                   {doc.status === 'review' && (
                      <button onClick={() => editDoc(doc.id, { status: 'final' })} className="rounded bg-primary/10 px-2 py-0.5 text-[8px] font-semibold text-primary-2 hover:bg-primary/20">{t('collabDocs.finalize')}</button>
                   )}
                   {doc.status === 'final' && (
                      <button onClick={() => editDoc(doc.id, { status: 'editing' })} className="rounded bg-surface-2 px-2 py-0.5 text-[8px] font-semibold text-text-3 hover:bg-primary/10">{t('collabDocs.reEdit')}</button>
                   )}
                    <button onClick={() => removeDoc(doc.id)} className="rounded bg-danger/10 px-2 py-0.5 text-[8px] font-semibold text-danger hover:bg-danger/20">{t('common.delete')}</button>
                 </div>
               </div>
             </div>
          );
        })
        )}
      </div>

      <Modal open={createModal.open} onClose={createModal.closeModal} title={t('collabDocs.createDocTitle')}
        footer={
          <>
            <button onClick={createModal.closeModal} className={btnSecondary}>{t('common.cancel')}</button>
            <button onClick={handleCreateDoc} className={btnPrimary} disabled={!newTitle.trim()}>{t('common.create')}</button>
          </>
        }>
        <ModalField label={t('collabDocs.docTitleLabel')}>
          <input className={inputCls} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder={t('collabDocs.docTitlePlaceholder')} />
        </ModalField>
        <ModalField label={t('collabDocs.docTypeLabel')}>
          <select className={inputCls} value={newType} onChange={(e) => setNewType(e.target.value)}>
            <option value="doc">{t('collabDocs.typeDoc')}</option>
            <option value="sheet">{t('collabDocs.typeSheet')}</option>
            <option value="slide">{t('collabDocs.typeSlide')}</option>
            <option value="other">{t('collabDocs.typeOther')}</option>
          </select>
        </ModalField>
      </Modal>
    </div>
  );
}
