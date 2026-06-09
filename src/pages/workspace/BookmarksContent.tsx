import { useState, useMemo } from 'react';
import { useBookmarks } from '@/hooks/useMatrix';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { useToast, ToastOverlay } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { hasFeature } from '@/lib/subscription';
import { Bookmark, Plus, Lock, Loader2, ExternalLink, Target, ListChecks, FileText, BookOpen } from 'lucide-react';
import { CardSkeleton } from '@/components/Skeleton';

const TYPE_CFG: Record<string, { label: string; color: string; icon: typeof Target }> = {
  goal: { label: '目标', color: 'bg-purple-500/20 text-purple-400', icon: Target },
  task: { label: '任务', color: 'bg-green-500/20 text-green-400', icon: ListChecks },
  doc: { label: '文档', color: 'bg-blue-500/20 text-blue-400', icon: FileText },
  knowledge: { label: '知识', color: 'bg-orange-500/20 text-orange-400', icon: BookOpen },
  other: { label: '其他', color: 'bg-surface-2 text-text-3', icon: Bookmark },
};

const ALL_TYPES = ['all', 'goal', 'task', 'doc', 'knowledge', 'other'];

export default function BookmarksContent() {
  const isPro = hasFeature('advancedAnalytics' as never);
  const { bookmarks, loading, addBookmark, removeBookmark } = useBookmarks();
  const addModal = useModal();
  const { toasts, success } = useToast();
  const [filterType, setFilterType] = useState('all');
  const [newItem, setNewItem] = useState({ title: '', url: '', target_type: 'other', category: '' });

  const filtered = useMemo(() => {
    let list = bookmarks;
    if (filterType !== 'all') list = list.filter((b) => b.target_type === filterType);
    return [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [bookmarks, filterType]);

  const handleAdd = async () => {
    if (!newItem.title.trim()) return;
    await addBookmark({ title: newItem.title, url: newItem.url, target_type: newItem.target_type, target_id: '', category: newItem.category, member_id: null, team_id: '' });
    success('书签已添加');
    setNewItem({ title: '', url: '', target_type: 'other', category: '' });
    addModal.closeModal();
  };

  if (loading) {
    return (
      <CardSkeleton />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <ToastOverlay toasts={toasts} />
      <div className="flex items-center gap-2">
        <Bookmark size={18} className="text-primary-2" />
        <span className="text-sm font-bold">书签</span>
        <span className="text-[10px] text-text-3">{filtered.length} 个书签</span>
        <div className="flex-1" />
        <button onClick={() => { if (!isPro) return; addModal.openModal(); }} className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary-2 transition-all hover:bg-primary/20">
          <Plus size={12} />
          添加书签
        </button>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {ALL_TYPES.map((t) => {
          const cfg = TYPE_CFG[t];
          return (
            <button key={t} onClick={() => setFilterType(t)} className={cn('shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-all', filterType === t ? 'bg-primary/10 text-primary-2' : 'text-text-3 hover:bg-surface-2')}>
              {t === 'all' ? '全部' : cfg?.label ?? t}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-text-3">
          <Bookmark size={32} className="mb-2 opacity-30" />
          <span className="text-xs">{filterType === 'all' ? '暂无书签' : '无匹配书签'}</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {filtered.map((bm) => {
            const cfg = TYPE_CFG[bm.target_type] ?? TYPE_CFG.other;
            const Icon = cfg.icon;
            return (
              <div key={bm.id} className="group flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-all hover:border-border-2 hover:shadow-lg">
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg shrink-0', cfg.color)}>
                  <Icon size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-text truncate">{bm.title}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-semibold', cfg.color)}>{cfg.label}</span>
                    {bm.category && <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[9px] text-text-3">{bm.category}</span>}
                  </div>
                  <div className="text-[9px] text-text-3 mt-0.5">{new Date(bm.created_at).toLocaleDateString('zh-CN')}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {bm.url && (
                    <a href={bm.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary-2 hover:bg-primary/20 transition-all" onClick={(e) => e.stopPropagation()}>
                      <ExternalLink size={10} />
                      前往
                    </a>
                  )}
                  <button onClick={() => removeBookmark(bm.id)} className="opacity-0 group-hover:opacity-100 rounded-lg px-1.5 py-1 text-[10px] text-text-3 hover:text-danger transition-opacity">x</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={addModal.open} onClose={addModal.closeModal} title="添加书签"
        footer={
          <div className="flex gap-2">
            <button className={btnSecondary} onClick={addModal.closeModal}>取消</button>
            <button className={btnPrimary} onClick={handleAdd} disabled={!newItem.title.trim()}>添加</button>
          </div>
        }>
        <ModalField label="标题">
          <input className={inputCls} placeholder="书签标题" value={newItem.title} onChange={(e) => setNewItem((p) => ({ ...p, title: e.target.value }))} />
        </ModalField>
        <ModalField label="URL">
          <input className={inputCls} placeholder="https://..." value={newItem.url} onChange={(e) => setNewItem((p) => ({ ...p, url: e.target.value }))} />
        </ModalField>
        <ModalField label="类型">
          <select className={inputCls} value={newItem.target_type} onChange={(e) => setNewItem((p) => ({ ...p, target_type: e.target.value }))}>
            {Object.entries(TYPE_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </ModalField>
        <ModalField label="分类">
          <input className={inputCls} placeholder="分类标签（可选）" value={newItem.category} onChange={(e) => setNewItem((p) => ({ ...p, category: e.target.value }))} />
        </ModalField>
      </Modal>
    </div>
  );
}
