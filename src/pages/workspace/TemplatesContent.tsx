import { useState, useMemo } from 'react';
import { useTemplates } from '@/hooks/useMatrix';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { useToast, ToastOverlay } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { hasFeature } from '@/lib/subscription';
import { FileCode2, Plus, Lock, Copy, Star, Pencil } from 'lucide-react';
import { CardSkeleton } from '@/components/Skeleton';
import { trackEvent } from '@/lib/behaviorTracker';
import { t } from '@/lib/i18nCore';

const CATEGORIES = ['PRD', '报告', '流程', '评审', '其他'] as const;

const CAT_LABEL: Record<string, string> = {
  PRD: 'templates.categoryPRD',
  报告: 'templates.categoryReport',
  流程: 'templates.categoryProcess',
  评审: 'templates.categoryReview',
  其他: 'templates.categoryOther',
};

const CAT_COLOR: Record<string, string> = {
  PRD: 'bg-purple-500/20 text-purple-400',
  报告: 'bg-blue-500/20 text-blue-400',
  流程: 'bg-green-500/20 text-green-400',
  评审: 'bg-orange-500/20 text-orange-400',
  其他: 'bg-surface-2 text-text-3',
};

export default function TemplatesContent() {
  const isPro = hasFeature('advancedAnalytics' as never);
  const { templates, loading, addTemplate, editTemplate, removeTemplate } = useTemplates();
  const addModal = useModal();
  const editTplModal = useModal();
  const { toasts, success } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState('all');
  const [newItem, setNewItem] = useState({ name: '', category: 'PRD', content: '' });
  const [editItem, setEditItem] = useState({ name: '', category: 'PRD', content: '' });

  const filtered = useMemo(() => {
    let list = templates;
    if (filterCat !== 'all') list = list.filter((t) => t.category === filterCat);
    return [...list].sort((a, b) => b.usage_count - a.usage_count);
  }, [templates, filterCat]);

  const selected = useMemo(() => templates.find((t) => t.id === selectedId) ?? null, [templates, selectedId]);

  const handleAdd = async () => {
    if (!newItem.name.trim()) return;
    await addTemplate({ name: newItem.name, category: newItem.category, content: newItem.content, usage_count: 0, is_built_in: false, team_id: '__default__' });
    trackEvent('template_create', { name: newItem.name, category: newItem.category });
    success(t('templates.templateCreated'));
    setNewItem({ name: '', category: 'PRD', content: '' });
    addModal.closeModal();
  };

  const handleUse = async (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    await editTemplate(id, { usage_count: t.usage_count + 1 });
    trackEvent('template_use', { id, name: t.name });
    success(t('templates.templateUsed', { name: t.name }));
  };

  const handleEdit = () => {
    if (!selected) return;
    setEditItem({ name: selected.name, category: selected.category, content: selected.content });
    editTplModal.openModal();
  };

  const handleEditSave = async () => {
    if (!selected || !editItem.name.trim()) return;
    await editTemplate(selected.id, { name: editItem.name, category: editItem.category, content: editItem.content });
    trackEvent('template_edit', { id: selected.id, name: editItem.name });
    success(t('templates.templateUpdated'));
    editTplModal.closeModal();
  };

  if (loading) {
    return (
      <CardSkeleton />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
      <ToastOverlay toasts={toasts} />
      <div className="flex flex-wrap items-center gap-2">
        <FileCode2 size={18} className="text-primary-2" />
        <span className="text-sm font-bold">{t('templates.title')}</span>
        <span className="text-[10px] text-text-3">{t('templates.templateCount', { count: templates.length })}</span>
        <div className="flex-1" />
        <button onClick={() => { if (!isPro) { alert(t('templates.paywallCreate')); return; } addModal.openModal(); }} className="flex flex-wrap items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary-2 transition-all hover:bg-primary/20">
          <Plus size={12} />
          {t('templates.newTemplate')}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {['all', ...CATEGORIES].map((c) => (
          <button key={c} onClick={() => setFilterCat(c)} className={cn('shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-all', filterCat === c ? 'bg-primary/10 text-primary-2' : 'text-text-3 hover:bg-surface-2')}>
            {c === 'all' ? t('templates.categoryAll') : t(CAT_LABEL[c] ?? c)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 min-h-0">
        <div className="w-64 shrink-0 space-y-1 overflow-y-auto max-h-[calc(100vh-220px)]">
          {filtered.map((tpl) => (
            <div key={tpl.id} onClick={() => setSelectedId(tpl.id)} className={cn('flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-all', selectedId === tpl.id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-surface-2 border border-transparent')}>
              <FileCode2 size={13} className="shrink-0 text-text-3" />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold text-text truncate">{tpl.name}</div>
                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                  <span className={cn('rounded-full px-1 py-0 text-[9px] font-semibold', CAT_COLOR[tpl.category] ?? CAT_COLOR['其他'])}>{t(CAT_LABEL[tpl.category] ?? tpl.category)}</span>
                  {tpl.is_built_in && <Star size={8} className="text-accent" />}
                  <span className="text-[9px] text-text-3">{tpl.usage_count}{t('templates.times')}</span>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-8 text-center text-[11px] text-text-3">{t('templates.noTemplates')}</div>
          )}
        </div>

        <div className="flex-1 min-w-0 rounded-xl border border-border bg-surface p-3 md:p-4">
          {selected ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-text">{selected.name}</span>
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', CAT_COLOR[selected.category] ?? CAT_COLOR['其他'])}>{t(CAT_LABEL[selected.category] ?? selected.category)}</span>
                {selected.is_built_in && <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent">{t('templates.builtin')}</span>}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-[10px] text-text-3">
                <span>{t('templates.usageCount')} {selected.usage_count}</span>
                <span>{t('templates.createdLabel')} {new Date(selected.created_at).toLocaleDateString()}</span>
                <span>{t('templates.updatedLabel')} {new Date(selected.updated_at).toLocaleDateString()}</span>
              </div>
              <div className="rounded-lg bg-surface-2 p-3 text-xs text-text-2 whitespace-pre-wrap max-h-[calc(100vh-380px)] overflow-y-auto">{selected.content || t('templates.noContent')}</div>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => handleUse(selected.id)} className="flex flex-wrap items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary-2 hover:bg-primary/20 transition-all">
                  <Copy size={12} />
                  {t('templates.useTemplate')}
                </button>
                {!selected.is_built_in && (
                  <>
                    <button onClick={handleEdit} className="flex items-center gap-1 rounded-lg bg-accent/10 px-3 py-1.5 text-[11px] font-semibold text-accent hover:bg-accent/20 transition-all">
                      <Pencil size={12} />{t('common.edit')}
                    </button>
                    <button onClick={() => { removeTemplate(selected.id); trackEvent('template_delete', { id: selected.id }); setSelectedId(null); }} className="rounded-lg px-3 py-1.5 text-[11px] text-text-3 hover:text-danger transition-colors">{t('common.delete')}</button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-text-3">
              <FileCode2 size={32} className="mb-2 opacity-30" />
              <span className="text-xs">{t('templates.selectHint')}</span>
            </div>
          )}
        </div>
      </div>

      <Modal open={addModal.open} onClose={addModal.closeModal} title={t('templates.newTitle')}
        footer={
          <div className="flex flex-wrap gap-2">
            <button className={btnSecondary} onClick={addModal.closeModal}>{t('common.cancel')}</button>
            <button className={btnPrimary} onClick={handleAdd} disabled={!newItem.name.trim()}>{t('common.create')}</button>
          </div>
        }>
        <ModalField label={t('templates.templateName')}>
          <input className={inputCls} placeholder={t('templates.templateName')} value={newItem.name} onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))} />
        </ModalField>
        <ModalField label={t('templates.category')}>
          <select className={inputCls} value={newItem.category} onChange={(e) => setNewItem((p) => ({ ...p, category: e.target.value }))}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{t(CAT_LABEL[c] ?? c)}</option>)}
          </select>
        </ModalField>
        <ModalField label={t('templates.content')}>
          <textarea className={cn(inputCls, 'min-h-[120px]')} placeholder={t('templates.contentPlaceholder')} value={newItem.content} onChange={(e) => setNewItem((p) => ({ ...p, content: e.target.value }))} />
        </ModalField>
      </Modal>

      <Modal open={editTplModal.open} onClose={editTplModal.closeModal} title={t('templates.editTitle')}
        footer={
          <div className="flex flex-wrap gap-2">
            <button className={btnSecondary} onClick={editTplModal.closeModal}>{t('common.cancel')}</button>
            <button className={btnPrimary} onClick={handleEditSave} disabled={!editItem.name.trim()}>{t('common.save')}</button>
          </div>
        }>
        <ModalField label={t('templates.templateName')}>
          <input className={inputCls} value={editItem.name} onChange={(e) => setEditItem((p) => ({ ...p, name: e.target.value }))} />
        </ModalField>
        <ModalField label={t('templates.category')}>
          <select className={inputCls} value={editItem.category} onChange={(e) => setEditItem((p) => ({ ...p, category: e.target.value }))}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{t(CAT_LABEL[c] ?? c)}</option>)}
          </select>
        </ModalField>
        <ModalField label={t('templates.content')}>
          <textarea className={cn(inputCls, 'min-h-[120px]')} value={editItem.content} onChange={(e) => setEditItem((p) => ({ ...p, content: e.target.value }))} />
        </ModalField>
      </Modal>
    </div>
  );
}
