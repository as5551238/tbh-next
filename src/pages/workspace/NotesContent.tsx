import { useState, useMemo } from 'react';
import { useNotes } from '@/hooks/useMatrix';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { useToast, ToastOverlay } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { hasFeature } from '@/lib/subscription';
import { StickyNote, Plus, Lock, Search, Pin } from 'lucide-react';
import { CardSkeleton } from '@/components/Skeleton';
import { t } from '@/lib/i18n';

const NOTE_COLORS = ['#7b6cf0', '#00d4aa', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];

export default function NotesContent() {
  const isPro = hasFeature('advancedAnalytics' as never);
  const { notes, loading, addNote, editNote, removeNote } = useNotes();
  const addModal = useModal();
  const editModal = useModal();
  const { toasts, success } = useToast();
  const [search, setSearch] = useState('');
  const [selectedNote, setSelectedNote] = useState<(typeof notes)[number] | null>(null);
  const [newItem, setNewItem] = useState({ title: '', content: '', tags: '', color: NOTE_COLORS[0], pinned: false });

  const pinned = useMemo(() => notes.filter((n) => n.pinned), [notes]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = notes.filter((n) => !n.pinned);
    if (q) {
      list = list.filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || (n.tags || []).some((tag) => tag.toLowerCase().includes(q)));
    }
    return list;
  }, [notes, search]);

  const handleAdd = async () => {
    if (!newItem.title.trim()) return;
    await addNote({ title: newItem.title, content: newItem.content, tags: newItem.tags.split(',').map((tag) => tag.trim()).filter(Boolean), color: newItem.color, pinned: newItem.pinned, member_id: null, team_id: '__default__' });
    success(t('notes.noteCreated'));
    setNewItem({ title: '', content: '', tags: '', color: NOTE_COLORS[0], pinned: false });
    addModal.closeModal();
  };

  const handleEdit = async () => {
    if (!selectedNote) return;
    await editNote(selectedNote.id, selectedNote as Partial<typeof selectedNote>);
    success(t('notes.noteUpdated'));
    editModal.closeModal();
  };

  if (loading) {
    return (
      <CardSkeleton />
    );
  }

  const renderCard = (note: (typeof notes)[number]) => (
    <div key={note.id} className="group flex rounded-xl border border-border bg-surface overflow-hidden transition-all hover:border-border-2 hover:shadow-lg cursor-pointer" onClick={() => { setSelectedNote(note); editModal.openModal(); }}>
      <div className="w-1.5 shrink-0" style={{ backgroundColor: note.color }} />
      <div className="flex-1 px-3 py-3 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {note.pinned && <Pin size={10} className="text-accent shrink-0" />}
          <span className="text-xs font-semibold text-text truncate">{note.title}</span>
        </div>
        <div className="text-[10px] text-text-3 mt-1 line-clamp-2">{note.content || t('notes.noContent')}</div>
        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
          {(note.tags || []).map((tag) => (
            <span key={tag} className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[9px] text-text-3">{tag}</span>
          ))}
        </div>
        <div className="text-[9px] text-text-3 mt-1.5">{new Date(note.updated_at).toLocaleDateString('zh-CN')}</div>
      </div>
      <div className="flex items-start pr-2 pt-2">
        <button onClick={(e) => { e.stopPropagation(); removeNote(note.id); }} className="opacity-0 group-hover:opacity-100 rounded-lg px-1.5 py-1 text-[10px] text-text-3 hover:text-danger transition-opacity">x</button>
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
      <ToastOverlay toasts={toasts} />
      <div className="flex flex-wrap items-center gap-2">
        <StickyNote size={18} className="text-primary-2" />
        <span className="text-sm font-bold">{t('notes.title')}</span>
        <span className="text-[10px] text-text-3">{t('notes.noteCount', { count: notes.length })}</span>
        <div className="flex-1" />
        <button onClick={() => { if (!isPro) return; addModal.openModal(); }} className="flex flex-wrap items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary-2 transition-all hover:bg-primary/20">
          <Plus size={12} />
          {t('notes.newNote')}
        </button>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
        <input className={cn(inputCls, 'pl-9')} aria-label={t('notes.searchAria')} placeholder={t('notes.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {pinned.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Pin size={12} className="text-accent" />
            <span className="text-[11px] font-semibold text-accent">{t('notes.pinned')}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{pinned.map(renderCard)}</div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-3">
            <StickyNote size={32} className="mb-2 opacity-30" />
            <span className="text-xs">{search ? t('notes.noMatch') : t('notes.noNotes')}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{filtered.map(renderCard)}</div>
        )}
      </div>

      <Modal open={addModal.open} onClose={addModal.closeModal} title={t('notes.newTitle')}
        footer={
          <div className="flex flex-wrap gap-2">
            <button className={btnSecondary} onClick={addModal.closeModal}>{t('common.cancel')}</button>
            <button className={btnPrimary} onClick={handleAdd} disabled={!newItem.title.trim()}>{t('common.create')}</button>
          </div>
        }>
        <ModalField label={t('notes.titleLabel')}>
          <input className={inputCls} placeholder={t('notes.titlePlaceholder')} value={newItem.title} onChange={(e) => setNewItem((p) => ({ ...p, title: e.target.value }))} />
        </ModalField>
        <ModalField label={t('notes.contentLabel')}>
          <textarea className={cn(inputCls, 'min-h-[80px]')} placeholder={t('notes.contentPlaceholder')} value={newItem.content} onChange={(e) => setNewItem((p) => ({ ...p, content: e.target.value }))} />
        </ModalField>
        <ModalField label={t('notes.tagsLabel')}>
          <input className={inputCls} placeholder={t('notes.tagsPlaceholder')} value={newItem.tags} onChange={(e) => setNewItem((p) => ({ ...p, tags: e.target.value }))} />
        </ModalField>
        <ModalField label={t('notes.colorLabel')}>
          <div className="flex flex-wrap items-center gap-2">
            {NOTE_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setNewItem((p) => ({ ...p, color: c }))} className={cn('h-6 w-6 rounded-full border-2 transition-all', newItem.color === c ? 'border-white scale-110' : 'border-transparent')}>
                <div className="h-full w-full rounded-full" style={{ backgroundColor: c }} />
              </button>
            ))}
          </div>
        </ModalField>
        <ModalField label={t('notes.pinnedLabel')}>
          <label className="flex flex-wrap items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={newItem.pinned} onChange={(e) => setNewItem((p) => ({ ...p, pinned: e.target.checked }))} className="accent-primary" />
            <span className="text-[11px] text-text-3">{t('notes.pinnedDisplayLabel')}</span>
          </label>
        </ModalField>
      </Modal>

      <Modal open={editModal.open} onClose={editModal.closeModal} title={t('notes.editTitle')}
        footer={
          <div className="flex flex-wrap gap-2">
            <button className="mr-auto rounded-lg bg-danger/10 px-4 py-2 text-xs font-semibold text-danger hover:bg-danger/20 transition-colors" onClick={() => { if (selectedNote) removeNote(selectedNote.id); editModal.closeModal(); }}>{t('common.delete')}</button>
            <button className={btnSecondary} onClick={editModal.closeModal}>{t('common.cancel')}</button>
            <button className={btnPrimary} onClick={handleEdit}>{t('common.save')}</button>
          </div>
        }>
        {selectedNote && (
          <div className="space-y-3">
            <ModalField label={t('notes.titleLabel')}>
              <input className={inputCls} value={selectedNote.title} onChange={(e) => setSelectedNote((p) => p ? { ...p, title: e.target.value } : p)} />
            </ModalField>
            <ModalField label={t('notes.contentLabel')}>
              <textarea className={cn(inputCls, 'min-h-[80px]')} value={selectedNote.content} onChange={(e) => setSelectedNote((p) => p ? { ...p, content: e.target.value } : p)} />
            </ModalField>
            <ModalField label={t('notes.tagsLabel')}>
              <input className={inputCls} value={(selectedNote.tags || []).join(', ')} onChange={(e) => setSelectedNote((p) => p ? { ...p, tags: e.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) } : p)} />
            </ModalField>
            <ModalField label={t('notes.colorLabel')}>
              <div className="flex flex-wrap items-center gap-2">
                {NOTE_COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setSelectedNote((p) => p ? { ...p, color: c } : p)} className={cn('h-6 w-6 rounded-full border-2 transition-all', selectedNote.color === c ? 'border-white scale-110' : 'border-transparent')}>
                    <div className="h-full w-full rounded-full" style={{ backgroundColor: c }} />
                  </button>
                ))}
              </div>
            </ModalField>
            <ModalField label={t('notes.pinnedLabel')}>
              <label className="flex flex-wrap items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={selectedNote.pinned} onChange={(e) => setSelectedNote((p) => p ? { ...p, pinned: e.target.checked } : p)} className="accent-primary" />
                <span className="text-[11px] text-text-3">{t('notes.pinnedDisplayLabel')}</span>
              </label>
            </ModalField>
          </div>
        )}
      </Modal>
    </div>
  );
}
