/**
 * TagsContent — 标签管理
 */
import { useState } from 'react';
import { useTags } from '@/hooks/useMatrix';
import type { TagRow } from '@/lib/dataLayer';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { Tag, Plus, Lock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CardSkeleton } from '@/components/Skeleton';
import { useLocale } from '@/lib/i18n';

export default function TagsContent() {
  const { t } = useLocale();
  const { tags, loading, addTag, removeTag } = useTags();
  const addModal = useModal();
  const [form, setForm] = useState({ name: '', color: 'var(--brand-accent)', target_type: 'task' });

  const TYPE_OPTIONS = [
    { value: 'task', label: t('tags.typeTask') },
    { value: 'goal', label: t('tags.typeGoal') },
    { value: 'project', label: t('tags.typeProject') },
    { value: 'risk', label: t('tags.typeRisk') },
    { value: 'doc', label: t('tags.typeDoc') },
    { value: 'knowledge', label: t('tags.typeKnowledge') },
  ];

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    await addTag({ name: form.name.trim(), color: form.color, target_type: form.target_type, usage_count: 0, team_id: '__default__' });
    setForm({ name: '', color: 'var(--brand-accent)', target_type: 'task' });
    addModal.closeModal();
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <Tag size={18} className="text-primary-2" />
        <span className="text-sm font-bold">{t('tags.title')}</span>
        <span className="ml-auto text-[10px] text-text-3">{t('tags.tagCount', { count: tags.length })}</span>
        <button className="flex flex-wrap items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20" onClick={() => addModal.openModal()}>
          <Plus size={12} />{t('tags.newTag')}
        </button>
      </div>

      {loading ? (
        <CardSkeleton />
      ) : tags.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-text-3">
          <Tag size={32} className="mb-2 opacity-30" />
          <span className="text-xs">{t('tags.noTags')}</span>
          <span className="text-[10px]">{t('tags.noTagsHint')}</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {tags.map((tag) => (
            <div key={tag.id} className="group relative rounded-xl border border-border bg-surface p-3 transition-all hover:border-border-2 hover:shadow-lg">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                <span className="text-xs font-semibold text-text truncate">{tag.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-text-3">{TYPE_OPTIONS.find((o) => o.value === tag.target_type)?.label || tag.target_type}</span>
                <span className="text-[10px] text-text-3">{t('tags.usageCount', { count: tag.usage_count })}</span>
              </div>
              <button
                className="absolute top-1.5 right-1.5 rounded-full p-0.5 text-text-3 opacity-0 hover:bg-danger/10 hover:text-danger group-hover:opacity-100 transition-opacity"
                onClick={() => removeTag(tag.id)}
                title={t('tags.delete')}
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={addModal.open} onClose={addModal.closeModal} title={t('tags.newTag')}
        footer={<div className="flex flex-wrap gap-2"><button className={btnSecondary} onClick={addModal.closeModal}>{t('common.cancel')}</button><button className={btnPrimary} onClick={handleAdd} disabled={!form.name.trim()}>{t('common.create')}</button></div>}
      >
        <ModalField label={t('tags.tagName')}>
          <input className={inputCls} placeholder={t('tags.tagNamePlaceholder')} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
        </ModalField>
        <ModalField label={t('tags.color')}>
          <div className="flex flex-wrap items-center gap-2">
            <input type="color" value={form.color} onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))} className="h-8 w-8 rounded border-0 cursor-pointer" />
            <span className="text-xs text-text-3">{form.color}</span>
          </div>
        </ModalField>
        <ModalField label={t('tags.targetType')}>
          <select className={inputCls} value={form.target_type} onChange={(e) => setForm((p) => ({ ...p, target_type: e.target.value }))}>
            {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </ModalField>
      </Modal>
    </div>
  );
}
