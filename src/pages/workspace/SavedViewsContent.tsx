/**
 * SavedViewsContent — 视图保存管理
 */
import { useState } from 'react';
import { useSavedViews } from '@/hooks/useMatrix';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { Eye, Plus, Lock, Star, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hasFeature } from '@/lib/subscription';
import { CardSkeleton } from '@/components/Skeleton';

const MODULE_OPTIONS = [
  { value: 'tasks', label: '任务' },
  { value: 'goals', label: '目标' },
  { value: 'projects', label: '项目' },
  { value: 'action_items', label: '行动项' },
  { value: 'risks', label: '风险' },
];

export default function SavedViewsContent() {
  const isPro = hasFeature('advancedAnalytics' as never);
  const { views, loading, addView, removeView } = useSavedViews();
  const addModal = useModal();
  const [form, setForm] = useState({ name: '', module: 'tasks', filters: '{}', sort_by: 'priority', columns: 'title,status,priority', is_default: false });

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    await addView({ name: form.name.trim(), module: form.module, filters: form.filters, sort_by: form.sort_by, columns: form.columns, is_default: form.is_default, member_id: null, team_id: '__default__' });
    setForm({ name: '', module: 'tasks', filters: '{}', sort_by: 'priority', columns: 'title,status,priority', is_default: false });
    addModal.closeModal();
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <Eye size={18} className="text-primary-2" />
        <span className="text-sm font-bold">保存的视图</span>
        <span className="ml-auto text-[10px] text-text-3">{views.length} 个视图</span>
        <button className="flex flex-wrap items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20" onClick={() => { if (!isPro) return; addModal.openModal(); }}>
          <Plus size={12} />保存当前视图
        </button>
      </div>

      {loading ? (
        <CardSkeleton />
      ) : views.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-text-3">
          <Eye size={32} className="mb-2 opacity-30" />
          <span className="text-xs">暂无保存的视图</span>
          <span className="text-[10px]">在任何列表页应用筛选后，点击"保存视图"快速访问</span>
        </div>
      ) : (
        <div className="space-y-2">
          {views.map((v) => (
            <div key={v.id} className="group flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-all hover:border-border-2 hover:shadow-lg">
              {v.is_default && <Star size={14} className="text-warn shrink-0" fill="currentColor" />}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-text">{v.name}</div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary-2">
                    {MODULE_OPTIONS.find((o) => o.value === v.module)?.label || v.module}
                  </span>
                  <span className="text-[10px] text-text-3">排序: {v.sort_by}</span>
                  <span className="text-[10px] text-text-3">列: {v.columns}</span>
                </div>
                <div className="text-[9px] text-text-3 mt-0.5 font-mono truncate">筛选: {v.filters}</div>
              </div>
              {v.is_default && <span className="text-[9px] text-warn font-semibold">默认</span>}
              <button className="rounded p-1 text-text-3 opacity-0 hover:bg-danger/10 hover:text-danger group-hover:opacity-100 transition-opacity" onClick={() => removeView(v.id)}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={addModal.open} onClose={addModal.closeModal} title="保存视图"
        footer={<div className="flex flex-wrap gap-2"><button className={btnSecondary} onClick={addModal.closeModal}>取消</button><button className={btnPrimary} onClick={handleAdd} disabled={!form.name.trim()}>保存</button></div>}
      >
        <ModalField label="视图名称">
          <input className={inputCls} placeholder="输入视图名称" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
        </ModalField>
        <ModalField label="所属模块">
          <select className={inputCls} value={form.module} onChange={(e) => setForm((p) => ({ ...p, module: e.target.value }))}>
            {MODULE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </ModalField>
        <ModalField label="筛选条件 (JSON)">
          <textarea className={cn(inputCls, 'min-h-[60px] font-mono text-[11px]')} value={form.filters} onChange={(e) => setForm((p) => ({ ...p, filters: e.target.value }))} />
        </ModalField>
        <ModalField label="排序字段">
          <input className={inputCls} value={form.sort_by} onChange={(e) => setForm((p) => ({ ...p, sort_by: e.target.value }))} />
        </ModalField>
        <ModalField label="显示列">
          <input className={inputCls} placeholder="逗号分隔" value={form.columns} onChange={(e) => setForm((p) => ({ ...p, columns: e.target.value }))} />
        </ModalField>
        <ModalField label="设为默认">
          <select className={inputCls} value={form.is_default ? 'yes' : 'no'} onChange={(e) => setForm((p) => ({ ...p, is_default: e.target.value === 'yes' }))}>
            <option value="no">否</option>
            <option value="yes">是</option>
          </select>
        </ModalField>
      </Modal>
    </div>
  );
}
