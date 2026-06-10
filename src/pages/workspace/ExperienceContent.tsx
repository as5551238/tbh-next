import { useState, useCallback } from 'react';
import { useExperiences, useIndustryColor } from '@/hooks/useMatrix';
import { useToast, ToastOverlay } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { BookOpen, Sparkles, Tag, Plus } from 'lucide-react';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import ItemDetailModal from '@/components/ItemDetailModal';
import type { ExperienceInput } from '@/contracts/dataContracts';
import { CardSkeleton } from '@/components/Skeleton';

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
    const tags = form.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
    addExperience({
      title: form.title,
      tags,
      author: form.author || undefined,
      content: form.content || undefined,
    } as ExperienceInput);
    modal.closeModal();
    success(`经验"${form.title}"已提炼`);
  }, [form, modal.closeModal]);

  if (loading) {
    return (
      <CardSkeleton />
    );
  }

  const allExperiences = experiences;

  const filteredExperiences = allExperiences.filter((e) => {
    if (searchFilter && !e.title.includes(searchFilter) && !(e.content ?? '').includes(searchFilter) && !(e.author ?? '').includes(searchFilter)) return false;
    if (tagFilter && !e.tags.some((t) => t.includes(tagFilter))) return false;
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <BookOpen size={18} style={{ color: indColor }} />
        <span className="text-sm font-bold">经验库</span>
        <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ backgroundColor: indColor + '20', color: indColor }}>知识沉淀</span>
        <button className="ml-auto flex flex-wrap items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20" onClick={handleOpen}>
          <Plus size={12} />
          提炼经验
        </button>
      </div>

      <div className="rounded-xl border border-border p-3 relative overflow-hidden cursor-pointer hover:border-primary/40 transition-colors" style={{ background: `linear-gradient(135deg, ${indColor}06 0%, transparent 100%)` }} onClick={handleOpen}>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Sparkles size={14} style={{ color: indColor }} />
          <span className="font-semibold text-text">经验库快捷入口</span>
        </div>
        <p className="mt-1 text-[11px] text-text-2">点击提炼新的经验条目，沉淀团队知识。</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 flex flex-wrap items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
          <BookOpen size={14} className="text-text-3" />
          <input type="text" value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} placeholder="搜索经验、标签、作者..." aria-label="搜索经验" className="flex-1 bg-transparent text-xs text-text outline-none placeholder:text-text-3" />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {['敏捷', '性能', '协作', 'PRD', '优化', '流程', '沟通', '模板'].map((t) => (
          <span key={t} onClick={() => setTagFilter(tagFilter === t ? '' : t)} className={cn('rounded-full px-2.5 py-1 text-[10px] cursor-pointer transition-colors',
            tagFilter === t ? 'bg-primary/10 text-primary-2 font-semibold' : 'bg-surface-2 text-text-2 hover:bg-primary/10 hover:text-primary-2'
          )}>
            <Tag size={9} className="inline mr-1" />{t}
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
            <p className="text-[11px] text-text-2 leading-relaxed mb-3">{e.content ?? '暂无内容'}</p>
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-1">
                {e.tags.map((t) => (
                  <span key={t} className="rounded bg-primary/5 px-1.5 py-0.5 text-[9px] text-primary-2">{t}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-primary-2">
          <Sparkles size={14} />
          <span className="font-semibold">经验提示</span>
        </div>
        <p className="mt-1 text-[11px] text-text-2">{allExperiences.length > 0 ? `当前共 ${allExperiences.length} 条经验，建议定期复盘并提炼高频引用的经验为标准流程。` : '暂无经验条目，点击"提炼经验"开始沉淀团队知识。'}</p>
      </div>

      <ToastOverlay toasts={toasts} />

      <Modal open={modal.open} onClose={modal.closeModal} title="提炼经验"
        footer={
          <div className="flex flex-wrap gap-2">
            <button className={btnSecondary} onClick={modal.closeModal}>取消</button>
            <button className={btnPrimary} onClick={handleSave} disabled={!form.title.trim()}>创建</button>
          </div>
        }>
        <ModalField label="经验标题">
          <input className={inputCls} placeholder="输入经验标题" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
        </ModalField>
        <ModalField label="内容">
          <textarea className={inputCls} rows={3} placeholder="输入经验内容" value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} />
        </ModalField>
        <ModalField label="作者">
          <input className={inputCls} placeholder="输入作者" value={form.author} onChange={(e) => setForm((p) => ({ ...p, author: e.target.value }))} />
        </ModalField>
        <ModalField label="标签（逗号分隔）">
          <input className={inputCls} placeholder="如：敏捷, 性能, 协作" value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} />
        </ModalField>
      </Modal>

      <ItemDetailModal
        open={editModal.open}
        onClose={editModal.closeModal}
        title="编辑经验"
        fields={[
          { key: 'title', label: '标题', type: 'text' },
          { key: 'content', label: '内容', type: 'textarea' },
          { key: 'author', label: '作者', type: 'text' },
          { key: 'tags', label: '标签', type: 'text' },
        ]}
        data={selectedExp ? { ...selectedExp, tags: selectedExp.tags.join(', ') } : null}
        commentTarget={selectedExp?.id ? { type: 'experience', id: String(selectedExp.id) } : null}
        onSave={(updated) => {
          const id = updated.id as string;
          const tags = typeof updated.tags === 'string' ? (updated.tags as string).split(/[,，]/).map((t: string) => t.trim()).filter(Boolean) : updated.tags;
          editExperience(id, { ...updated, tags } as Record<string, unknown>);
        }}
        onDelete={() => {
          if (selectedExp) removeExperience(selectedExp.id);
        }}
      />
    </div>
  );
}
