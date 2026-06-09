import { useState, useMemo } from 'react';
import { useTemplates } from '@/hooks/useMatrix';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { useToast, ToastOverlay } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { hasFeature } from '@/lib/subscription';
import { FileCode2, Plus, Lock, Copy, Star } from 'lucide-react';
import { CardSkeleton } from '@/components/Skeleton';

const CATEGORIES = ['PRD', '报告', '流程', '评审', '其他'] as const;

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
  const { toasts, success } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState('all');
  const [newItem, setNewItem] = useState({ name: '', category: 'PRD', content: '' });

  const filtered = useMemo(() => {
    let list = templates;
    if (filterCat !== 'all') list = list.filter((t) => t.category === filterCat);
    return [...list].sort((a, b) => b.usage_count - a.usage_count);
  }, [templates, filterCat]);

  const selected = useMemo(() => templates.find((t) => t.id === selectedId) ?? null, [templates, selectedId]);

  const handleAdd = async () => {
    if (!newItem.name.trim()) return;
    await addTemplate({ name: newItem.name, category: newItem.category, content: newItem.content, usage_count: 0, is_built_in: false, team_id: '' });
    success('模板已创建');
    setNewItem({ name: '', category: 'PRD', content: '' });
    addModal.closeModal();
  };

  const handleUse = async (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    await editTemplate(id, { usage_count: t.usage_count + 1 });
    success(`已使用模板「${t.name}」`);
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
        <span className="text-sm font-bold">模板库</span>
        <span className="text-[10px] text-text-3">{templates.length} 个模板</span>
        <div className="flex-1" />
        <button onClick={() => { if (!isPro) return; addModal.openModal(); }} className="flex flex-wrap items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary-2 transition-all hover:bg-primary/20">
          <Plus size={12} />
          新建模板
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {['all', ...CATEGORIES].map((c) => (
          <button key={c} onClick={() => setFilterCat(c)} className={cn('shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-all', filterCat === c ? 'bg-primary/10 text-primary-2' : 'text-text-3 hover:bg-surface-2')}>
            {c === 'all' ? '全部' : c}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 min-h-0">
        <div className="w-64 shrink-0 space-y-1 overflow-y-auto max-h-[calc(100vh-220px)]">
          {filtered.map((t) => (
            <div key={t.id} onClick={() => setSelectedId(t.id)} className={cn('flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-all', selectedId === t.id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-surface-2 border border-transparent')}>
              <FileCode2 size={13} className="shrink-0 text-text-3" />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold text-text truncate">{t.name}</div>
                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                  <span className={cn('rounded-full px-1 py-0 text-[9px] font-semibold', CAT_COLOR[t.category] ?? CAT_COLOR['其他'])}>{t.category}</span>
                  {t.is_built_in && <Star size={8} className="text-accent" />}
                  <span className="text-[9px] text-text-3">{t.usage_count}次</span>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-8 text-center text-[11px] text-text-3">暂无模板</div>
          )}
        </div>

        <div className="flex-1 min-w-0 rounded-xl border border-border bg-surface p-3 md:p-4">
          {selected ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-text">{selected.name}</span>
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', CAT_COLOR[selected.category] ?? CAT_COLOR['其他'])}>{selected.category}</span>
                {selected.is_built_in && <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent">内置</span>}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-[10px] text-text-3">
                <span>使用次数: {selected.usage_count}</span>
                <span>创建: {new Date(selected.created_at).toLocaleDateString('zh-CN')}</span>
                <span>更新: {new Date(selected.updated_at).toLocaleDateString('zh-CN')}</span>
              </div>
              <div className="rounded-lg bg-surface-2 p-3 text-xs text-text-2 whitespace-pre-wrap max-h-[calc(100vh-380px)] overflow-y-auto">{selected.content || '暂无内容'}</div>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => handleUse(selected.id)} className="flex flex-wrap items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary-2 hover:bg-primary/20 transition-all">
                  <Copy size={12} />
                  使用模板
                </button>
                {!selected.is_built_in && (
                  <button onClick={() => { removeTemplate(selected.id); setSelectedId(null); }} className="rounded-lg px-3 py-1.5 text-[11px] text-text-3 hover:text-danger transition-colors">删除</button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-text-3">
              <FileCode2 size={32} className="mb-2 opacity-30" />
              <span className="text-xs">选择模板查看详情</span>
            </div>
          )}
        </div>
      </div>

      <Modal open={addModal.open} onClose={addModal.closeModal} title="新建模板"
        footer={
          <div className="flex flex-wrap gap-2">
            <button className={btnSecondary} onClick={addModal.closeModal}>取消</button>
            <button className={btnPrimary} onClick={handleAdd} disabled={!newItem.name.trim()}>创建</button>
          </div>
        }>
        <ModalField label="模板名称">
          <input className={inputCls} placeholder="模板名称" value={newItem.name} onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))} />
        </ModalField>
        <ModalField label="分类">
          <select className={inputCls} value={newItem.category} onChange={(e) => setNewItem((p) => ({ ...p, category: e.target.value }))}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </ModalField>
        <ModalField label="模板内容">
          <textarea className={cn(inputCls, 'min-h-[120px]')} placeholder="模板内容..." value={newItem.content} onChange={(e) => setNewItem((p) => ({ ...p, content: e.target.value }))} />
        </ModalField>
      </Modal>
    </div>
  );
}
