import { useState, useMemo } from 'react';
import { useActivities } from '@/hooks/useMatrix';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { useToast, ToastOverlay } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { hasFeature } from '@/lib/subscription';
import { Activity, Plus, Lock, Loader2, Filter } from 'lucide-react';
import { CardSkeleton } from '@/components/Skeleton';

const TYPE_CFG: Record<string, { label: string; color: string }> = {
  created: { label: '创建', color: 'bg-blue-500/20 text-blue-400' },
  updated: { label: '更新', color: 'bg-yellow-500/20 text-yellow-400' },
  completed: { label: '完成', color: 'bg-green-500/20 text-green-400' },
  commented: { label: '评论', color: 'bg-purple-500/20 text-purple-400' },
  mentioned: { label: '提及', color: 'bg-orange-500/20 text-orange-400' },
};

const ALL_TYPES = ['all', 'created', 'updated', 'completed', 'commented', 'mentioned'];

export default function ActivitiesContent() {
  const isPro = hasFeature('advancedAnalytics' as never);
  const { activities, loading, addActivity } = useActivities();
  const addModal = useModal();
  const { toasts, success } = useToast();
  const [filterType, setFilterType] = useState('all');
  const [newItem, setNewItem] = useState({ title: '', description: '', type: 'created', actor: '' });

  const filtered = useMemo(() => {
    let list = activities;
    if (filterType !== 'all') list = list.filter((a) => a.type === filterType);
    return [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [activities, filterType]);

  const handleAdd = async () => {
    if (!newItem.title.trim()) return;
    await addActivity({ title: newItem.title, description: newItem.description, type: newItem.type, actor: newItem.actor || '系统', target_type: null, target_id: null, team_id: '' });
    success('活动已添加');
    setNewItem({ title: '', description: '', type: 'created', actor: '' });
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
        <Activity size={18} className="text-primary-2" />
        <span className="text-sm font-bold">活动动态</span>
        <span className="text-[10px] text-text-3">{filtered.length} 条</span>
        <div className="flex-1" />
        <button onClick={() => { if (!isPro) return; addModal.openModal(); }} className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary-2 transition-all hover:bg-primary/20">
          <Plus size={12} />
          添加活动
        </button>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <Filter size={12} className="text-text-3 shrink-0" />
        {ALL_TYPES.map((t) => (
          <button key={t} onClick={() => setFilterType(t)} className={cn('shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-all', filterType === t ? 'bg-primary/10 text-primary-2' : 'text-text-3 hover:bg-surface-2')}>
            {t === 'all' ? '全部' : TYPE_CFG[t]?.label ?? t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-text-3">
          <Activity size={32} className="mb-2 opacity-30" />
          <span className="text-xs">暂无活动</span>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const cfg = TYPE_CFG[item.type] ?? TYPE_CFG.updated;
            return (
              <div key={item.id} className="flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-all hover:border-border-2 hover:shadow-lg">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 shrink-0 mt-0.5">
                  <Activity size={14} className="text-text-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-text">{item.title}</span>
                    <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', cfg.color)}>{cfg.label}</span>
                  </div>
                  {item.description && (
                    <div className="text-[10px] text-text-3 mt-0.5 line-clamp-2">{item.description}</div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-primary-2">{item.actor}</span>
                    <span className="text-[10px] text-text-3">{new Date(item.created_at).toLocaleString('zh-CN')}</span>
                    {item.target_type && (
                      <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] text-text-3">{item.target_type}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={addModal.open} onClose={addModal.closeModal} title="添加活动"
        footer={
          <div className="flex gap-2">
            <button className={btnSecondary} onClick={addModal.closeModal}>取消</button>
            <button className={btnPrimary} onClick={handleAdd} disabled={!newItem.title.trim()}>添加</button>
          </div>
        }>
        <ModalField label="标题">
          <input className={inputCls} placeholder="活动标题" value={newItem.title} onChange={(e) => setNewItem((p) => ({ ...p, title: e.target.value }))} />
        </ModalField>
        <ModalField label="描述">
          <textarea className={cn(inputCls, 'min-h-[60px]')} placeholder="活动描述（可选）" value={newItem.description} onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))} />
        </ModalField>
        <ModalField label="类型">
          <select className={inputCls} value={newItem.type} onChange={(e) => setNewItem((p) => ({ ...p, type: e.target.value }))}>
            {Object.entries(TYPE_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </ModalField>
        <ModalField label="操作人">
          <input className={inputCls} placeholder="操作人（默认系统）" value={newItem.actor} onChange={(e) => setNewItem((p) => ({ ...p, actor: e.target.value }))} />
        </ModalField>
      </Modal>
    </div>
  );
}
