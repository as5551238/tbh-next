/**
 * CategoriesContent
 */
import { useState } from 'react';
import { useCategories } from '@/hooks/useMatrix';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { FolderTree, Plus, Lock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hasFeature } from '@/lib/subscription';
import { CardSkeleton } from '@/components/Skeleton';
import { t } from '@/lib/i18n';

const TYPE_OPTIONS = [
  { value: 'module', label: () => t('categories.typeModule') },
  { value: 'priority', label: () => t('categories.typePriority') },
  { value: 'status', label: () => t('categories.typeStatus') },
  { value: 'custom', label: () => t('categories.typeCustom') },
];

export default function CategoriesContent() {
  const isPro = hasFeature('advancedAnalytics' as never);
  const { categories, loading, addCategory, removeCategory } = useCategories();
  const addModal = useModal();
  const [form, setForm] = useState({ name: '', type: 'module', icon: '📁', color: 'var(--brand-accent)', sort_order: 0 });

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    await addCategory({ name: form.name.trim(), type: form.type, icon: form.icon, color: form.color, sort_order: form.sort_order, team_id: '__default__' });
    setForm({ name: '', type: 'module', icon: '📁', color: 'var(--brand-accent)', sort_order: 0 });
    addModal.closeModal();
  };

  const grouped = categories.reduce((acc, c) => {
    const key = c.type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {} as Record<string, typeof categories>);

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <FolderTree size={18} className="text-primary-2" />
        <span className="text-sm font-bold">{t('categories.title')}</span>
        <span className="ml-auto text-[10px] text-text-3">{t('categories.categoryCount', { count: categories.length })}</span>
        <button className="flex flex-wrap items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20" onClick={() => { if (!isPro) return; addModal.openModal(); }}>
          <Plus size={12} />{t('categories.newCategory')}
        </button>
      </div>

      {loading ? (
        <CardSkeleton />
      ) : (
        Object.entries(grouped).map(([type, items]) => (
          <div key={type}>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-bold text-text uppercase tracking-wider">{TYPE_OPTIONS.find((o) => o.value === type)?.label() || type}</span>
              <span className="text-[10px] text-text-3">{items.length}</span>
            </div>
            <div className="space-y-1">
              {items.sort((a, b) => a.sort_order - b.sort_order).map((c) => (
                <div key={c.id} className="group flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 transition-all hover:border-border-2">
                  <span className="text-base">{c.icon}</span>
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="text-xs font-semibold text-text flex-1">{c.name}</span>
                  <span className="text-[10px] text-text-3">{t('categories.sortOrder', { value: c.sort_order })}</span>
                  <button className="rounded p-0.5 text-text-3 opacity-0 hover:bg-danger/10 hover:text-danger group-hover:opacity-100 transition-opacity" onClick={() => removeCategory(c.id)} aria-label={t('categories.deleteCategoryAria')}>
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <Modal open={addModal.open} onClose={addModal.closeModal} title={t('categories.newCategoryTitle')}
        footer={<div className="flex flex-wrap gap-2"><button className={btnSecondary} onClick={addModal.closeModal}>{t('common.cancel')}</button><button className={btnPrimary} onClick={handleAdd} disabled={!form.name.trim()}>{t('common.create')}</button></div>}
      >
        <ModalField label={t('categories.nameLabel')}>
          <input className={inputCls} placeholder={t('categories.namePlaceholder')} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
        </ModalField>
        <ModalField label={t('categories.typeLabel')}>
          <select className={inputCls} value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
            {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label()}</option>)}
          </select>
        </ModalField>
        <ModalField label={t('categories.iconLabel')}>
          <input className={inputCls} placeholder={t('categories.iconPlaceholder')} value={form.icon} onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))} />
        </ModalField>
        <ModalField label={t('categories.colorLabel')}>
          <div className="flex flex-wrap items-center gap-2">
            <input type="color" value={form.color} onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))} className="h-8 w-8 rounded border-0 cursor-pointer" />
            <span className="text-xs text-text-3">{form.color}</span>
          </div>
        </ModalField>
        <ModalField label={t('categories.sortLabel')}>
          <input type="number" className={inputCls} value={form.sort_order} onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value) }))} />
        </ModalField>
      </Modal>
    </div>
  );
}
