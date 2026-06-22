import { useState, useCallback } from 'react';
import { useExperiences, useIndustryColor } from '@/hooks/useMatrix';
import { useToast, ToastOverlay } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { BookOpen, Sparkles, Tag, Plus } from 'lucide-react';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import ItemDetailModal from '@/components/ItemDetailModal';
import type { ExperienceInput } from '@/contracts/dataContracts';
import { CardSkeleton } from '@/components/Skeleton';
import { t } from '@/lib/i18n';

export default function ExperienceContent() {
  const indColor = useIndustryColor();
  const { experiences, addExperience, editExperience, removeExperience, loading } = useExperiences();
  const modal = useModal();
  const editModal = useModal();
  const [selectedExp, setSelectedExp] = useState<(typeof experiences)[number] | null>(null);
  const [form, setForm] = useState({ title: '', content: '', author: '', tags: '' });
  const [searchFilter, setSearchFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const { toasts, success } = useToast();

  const handleOpen = useCallback(() => {
    setForm({ title: '', content: '', author: '', tags: '' });
    modal.openModal();
  }, [modal.openModal]);

  const handleSave = useCallback(() => {
    if (!form.title.trim()) return;
    const tags = form.tags.split(/[,，]/).map((item) => item.trim()).filter(Boolean);
    addExperience({
      title: form.title,
      tags,
      author: form.author || undefined,
      content: form.content || undefined,
    } as ExperienceInput);
    modal.closeModal();
    success(t('experience.created', { title: form.title }));
  }, [form, modal.closeModal]);

  if (loading) {
    return (
      <CardSkeleton />
    );
  }

  const allExperiences = experiences;

  const filteredExperiences = allExperiences.filter((e) => {
    if (searchFilter && !e.title.includes(searchFilter) && !(e.content ?? '').includes(searchFilter) && !(e.author ?? '').includes(searchFilter)) return false;
    if (tagFilter && !e.tags.some((tag) => tag.includes(tagFilter))) return false;
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <BookOpen size={18} style={{ color: indColor }} />
        <span className="text-sm font-bold">{t('experience.title')}</span>
        <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ backgroundColor: indColor + '20', color: indColor }}>{t('experience.knowledgeDeposit')}</span>
        <button className="ml-auto flex flex-wrap items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20" onClick={handleOpen}>
          <Plus size={12} />
          {t('experience.extractExp')}
        </button>
      </div>

      <div className="rounded-xl border border-border p-3 relative overflow-hidden cursor-pointer hover:border-primary/40 transition-colors" style={{ background: `linear-gradient(135deg, ${indColor}06 0%, transparent 100%)` }} onClick={handleOpen}>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Sparkles size={14} style={{ color: indColor }} />
          <span className="font-semibold text-text">{t('experience.quickEntry')}</span>
        </div>
        <p className="mt-1 text-[11px] text-text-2">{t('experience.quickEntryDesc')}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 flex flex-wrap items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
          <BookOpen size={14} className="text-text-3" />
          <input type="text" value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} placeholder={t('experience.searchPlaceholder')} aria-label={t('experience.searchAria')} className="flex-1 bg-transparent text-xs text-text outline-none placeholder:text-text-3" />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {['敏捷', '性能', '协作', 'PRD', '优化', '流程', '沟通', '模板'].map((item) => (
          <span key={item} onClick={() => setTagFilter(tagFilter === item ? '' : item)} className={cn('rounded-full px-2.5 py-1 text-[10px] cursor-pointer transition-colors',
            tagFilter === item ? 'bg-primary/10 text-primary-2 font-semibold' : 'bg-surface-2 text-text-2 hover:bg-primary/10 hover:text-primary-2'
          )}>
            <Tag size={9} className="inline mr-1" />{item}
          </span>
        ))}
      </div>

      <div className="space-y-3">
        {filteredExperiences.map((e) => (
          <div key={e.id} className="rounded-xl border border-border bg-surface p-3 md:p-4 transition-all hover:border-border-2 hover:shadow-lg cursor-pointer" onClick={() => { setSelectedExp(e); editModal.openModal(); }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-text">{e.title}</span>
              {e.author && <span className="text-[10px] text-text-3">{e.author}</span>}
            </div>
            <p className="text-[11px] text-text-2 leading-relaxed mb-3">{e.content ?? t('experience.noContent')}</p>
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-1">
                {e.tags.map((tag) => (
                  <span key={tag} className="rounded bg-primary/5 px-1.5 py-0.5 text-[9px] text-primary-2">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-primary-2">
          <Sparkles size={14} />
          <span className="font-semibold">{t('experience.expTip')}</span>
        </div>
        <p className="mt-1 text-[11px] text-text-2">{allExperiences.length > 0 ? t('experience.expTipWithCount', { count: allExperiences.length }) : t('experience.expTipEmpty')}</p>
      </div>

      <ToastOverlay toasts={toasts} />

      <Modal open={modal.open} onClose={modal.closeModal} title={t('experience.extractTitle')}
        footer={
          <div className="flex flex-wrap gap-2">
            <button className={btnSecondary} onClick={modal.closeModal}>{t('common.cancel')}</button>
            <button className={btnPrimary} onClick={handleSave} disabled={!form.title.trim()}>{t('common.create')}</button>
          </div>
        }>
        <ModalField label={t('experience.expTitle')}>
          <input className={inputCls} placeholder={t('experience.expTitlePlaceholder')} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
        </ModalField>
        <ModalField label={t('experience.contentLabel')}>
          <textarea className={inputCls} rows={3} placeholder={t('experience.contentPlaceholder')} value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} />
        </ModalField>
        <ModalField label={t('experience.authorLabel')}>
          <input className={inputCls} placeholder={t('experience.authorPlaceholder')} value={form.author} onChange={(e) => setForm((p) => ({ ...p, author: e.target.value }))} />
        </ModalField>
        <ModalField label={t('experience.tagsLabel')}>
          <input className={inputCls} placeholder={t('experience.tagsPlaceholder')} value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} />
        </ModalField>
      </Modal>

      <ItemDetailModal
        open={editModal.open}
        onClose={editModal.closeModal}
        title={t('experience.editTitle')}
        fields={[
          { key: 'title', label: t('experience.titleLabel'), type: 'text' },
          { key: 'content', label: t('experience.contentLabel'), type: 'textarea' },
          { key: 'author', label: t('experience.authorLabel'), type: 'text' },
          { key: 'tags', label: t('experience.tagsLabel'), type: 'text' },
        ]}
        data={selectedExp ? { ...selectedExp, tags: selectedExp.tags.join(', ') } : null}
        commentTarget={selectedExp?.id ? { type: 'experience', id: String(selectedExp.id) } : null}
        onSave={(updated) => {
          const id = updated.id as string;
          const tags = typeof updated.tags === 'string' ? (updated.tags as string).split(/[,，]/).map((s: string) => s.trim()).filter(Boolean) : updated.tags;
          editExperience(id, { ...updated, tags } as Record<string, unknown>);
        }}
        onDelete={() => {
          if (selectedExp) removeExperience(selectedExp.id);
        }}
      />
    </div>
  );
}
