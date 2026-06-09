/**
 * StatusFlowContent — 状态流转规则管理
 */
import { hasFeature } from '@/lib/subscription';
import { useState, useMemo } from 'react';
import { useStatusFlowRules } from '@/hooks/useMatrix';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { GitBranch, Plus, Lock, ArrowRight, X, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CardSkeleton } from '@/components/Skeleton';

const ENTITY_OPTIONS = [
  { value: 'task', label: '任务' },
  { value: 'goal', label: '目标' },
  { value: 'approval', label: '审批' },
  { value: 'action_item', label: '行动项' },
];

export default function StatusFlowContent() {
  const isPro = hasFeature('advancedAnalytics' as never);
  const { rules, loading, addRule, removeRule } = useStatusFlowRules();
  const addModal = useModal();
  const [form, setForm] = useState({ entity_type: 'task', from_status: '', to_status: '', condition_config: '{}', auto_transition: false, require_comment: false });

  const handleAdd = async () => {
    if (!form.from_status.trim() || !form.to_status.trim()) return;
    await addRule({ ...form, team_id: '__default__' });
    setForm({ entity_type: 'task', from_status: '', to_status: '', condition_config: '{}', auto_transition: false, require_comment: false });
    addModal.closeModal();
  };

  const grouped = useMemo(() => {
    const map: Record<string, typeof rules> = {};
    for (const r of rules) {
      if (!map[r.entity_type]) map[r.entity_type] = [];
      map[r.entity_type].push(r);
    }
    return map;
  }, [rules]);

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <GitBranch size={18} className="text-primary-2" />
        <span className="text-sm font-bold">状态流转规则</span>
        <span className="ml-auto text-[10px] text-text-3">{rules.length} 条规则</span>
        <button className="flex flex-wrap items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20" onClick={() => { if (!isPro) return; addModal.openModal(); }}>
          <Plus size={12} />新建规则
        </button>
      </div>

      {loading ? (
        <CardSkeleton />
      ) : (
        Object.entries(grouped).map(([entityType, items]) => (
          <div key={entityType}>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-bold text-text uppercase tracking-wider">
                {ENTITY_OPTIONS.find((o) => o.value === entityType)?.label || entityType}
              </span>
              <span className="text-[10px] text-text-3">{items.length} 条流转</span>
            </div>
            <div className="space-y-1.5">
              {items.map((r) => (
                <div key={r.id} className="group flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 transition-all hover:border-border-2">
                  <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-text">{r.from_status}</span>
                    <ArrowRight size={12} className="text-text-3 shrink-0" />
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary-2">{r.to_status}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    {r.auto_transition && (
                      <span className="flex flex-wrap items-center gap-0.5 text-[9px] font-semibold text-success">
                        <CheckCircle2 size={9} />自动
                      </span>
                    )}
                    {r.require_comment && (
                      <span className="rounded-full bg-warn/10 px-1.5 py-0.5 text-[9px] font-semibold text-warn">需评论</span>
                    )}
                    <button className="rounded p-0.5 text-text-3 opacity-0 hover:bg-danger/10 hover:text-danger group-hover:opacity-100 transition-opacity" onClick={() => removeRule(r.id)}>
                      <X size={10} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <Modal open={addModal.open} onClose={addModal.closeModal} title="新建流转规则"
        footer={<div className="flex flex-wrap gap-2"><button className={btnSecondary} onClick={addModal.closeModal}>取消</button><button className={btnPrimary} onClick={handleAdd} disabled={!form.from_status.trim() || !form.to_status.trim()}>创建</button></div>}
      >
        <ModalField label="实体类型">
          <select className={inputCls} value={form.entity_type} onChange={(e) => setForm((p) => ({ ...p, entity_type: e.target.value }))}>
            {ENTITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </ModalField>
        <ModalField label="从状态">
          <input className={inputCls} placeholder="e.g. todo" value={form.from_status} onChange={(e) => setForm((p) => ({ ...p, from_status: e.target.value }))} />
        </ModalField>
        <ModalField label="到状态">
          <input className={inputCls} placeholder="e.g. in_progress" value={form.to_status} onChange={(e) => setForm((p) => ({ ...p, to_status: e.target.value }))} />
        </ModalField>
        <ModalField label="自动流转">
          <select className={inputCls} value={form.auto_transition ? 'yes' : 'no'} onChange={(e) => setForm((p) => ({ ...p, auto_transition: e.target.value === 'yes' }))}>
            <option value="no">否</option>
            <option value="yes">是</option>
          </select>
        </ModalField>
        <ModalField label="需要评论">
          <select className={inputCls} value={form.require_comment ? 'yes' : 'no'} onChange={(e) => setForm((p) => ({ ...p, require_comment: e.target.value === 'yes' }))}>
            <option value="no">否</option>
            <option value="yes">是</option>
          </select>
        </ModalField>
      </Modal>
    </div>
  );
}
