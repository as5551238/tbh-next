/**
 * TagsContent — 标签管理
 */
import { useState } from 'react';
import { useTags } from '@/hooks/useMatrix';
import type { TagRow } from '@/lib/dataLayer';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { Tag, Plus, Lock, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hasFeature } from '@/lib/subscription';
import { CardSkeleton } from '@/components/Skeleton';

const TYPE_OPTIONS = [
  { value: 'task', label: '任务' },
  { value: 'goal', label: '目标' },
  { value: 'project', label: '项目' },
  { value: 'risk', label: '风险' },
  { value: 'doc', label: '文档' },
  { value: 'knowledge', label: '知识' },
];

export default function TagsContent() {
  const isPro = hasFeature('advancedAnalytics' as never);
  const { tags, loading, addTag, removeTag } = useTags();
  const addModal = useModal();
  const [form, setForm] = useState({ name: '', color: 'var(--brand-accent)', target_type: 'task' });

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    await addTag({ name: form.name.trim(), color: form.color, target_type: form.target_type, usage_count: 0, team_id: '__default__' });
    setForm({ name: '', color: 'var(--brand-accent)', target_type: 'task' });
    addModal.closeModal();
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Tag size={18} className="text-primary-2" />
        <span className="text-sm font-bold">标签管理</span>
        <span className="ml-auto text-[10px] text-text-3">{tags.length} 个标签</span>
        <button className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20" onClick={() => { if (!isPro) return; addModal.openModal(); }}>
          <Plus size={12} />新建标签
        </button>
      </div>

      {loading ? (
        <CardSkeleton />
      ) : tags.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-text-3">
          <Tag size={32} className="mb-2 opacity-30" />
          <span className="text-xs">暂无标签</span>
          <span className="text-[10px]">创建标签来对任务、目标、项目进行分类</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {tags.map((t) => (
            <div key={t.id} className="group relative rounded-xl border border-border bg-surface p-3 transition-all hover:border-border-2 hover:shadow-lg">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                <span className="text-xs font-semibold text-text truncate">{t.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-text-3">{TYPE_OPTIONS.find((o) => o.value === t.target_type)?.label || t.target_type}</span>
                <span className="text-[10px] text-text-3">{t.usage_count} 次使用</span>
              </div>
              <button
                className="absolute top-1.5 right-1.5 rounded-full p-0.5 text-text-3 opacity-0 hover:bg-danger/10 hover:text-danger group-hover:opacity-100 transition-opacity"
                onClick={() => removeTag(t.id)}
                title="删除"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={addModal.open} onClose={addModal.closeModal} title="新建标签"
        footer={<div className="flex gap-2"><button className={btnSecondary} onClick={addModal.closeModal}>取消</button><button className={btnPrimary} onClick={handleAdd} disabled={!form.name.trim()}>创建</button></div>}
      >
        <ModalField label="标签名称">
          <input className={inputCls} placeholder="输入标签名称" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
        </ModalField>
        <ModalField label="颜色">
          <div className="flex items-center gap-2">
            <input type="color" value={form.color} onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))} className="h-8 w-8 rounded border-0 cursor-pointer" />
            <span className="text-xs text-text-3">{form.color}</span>
          </div>
        </ModalField>
        <ModalField label="适用类型">
          <select className={inputCls} value={form.target_type} onChange={(e) => setForm((p) => ({ ...p, target_type: e.target.value }))}>
            {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </ModalField>
      </Modal>
    </div>
  );
}
