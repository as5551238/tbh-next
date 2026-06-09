import { useGateCheck } from '@/hooks/useGateCheck';
import PaywallModal from '@/components/PaywallModal';
import { hasFeature } from '@/lib/subscription'; // gate: Pro feature check
/**
 * AutomationContent — 自动化规则管理
 */
import { useState } from 'react';
import { useAutomationRules } from '@/hooks/useMatrix';
import type { AutomationRuleRow } from '@/lib/dataLayer';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { Zap, Plus, Loader2, Power, PowerOff, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const TRIGGER_OPTIONS = [
  { value: 'schedule', label: '定时触发' },
  { value: 'goal_completed', label: '目标完成' },
  { value: 'deviation_created', label: '偏差创建' },
  { value: 'member_joined', label: '成员加入' },
  { value: 'task_overdue', label: '任务逾期' },
];
const ACTION_OPTIONS = [
  { value: 'update_task', label: '更新任务' },
  { value: 'send_notification', label: '发送通知' },
  { value: 'create_action_item', label: '创建行动项' },
  { value: 'assign_tasks', label: '分配任务' },
];

export default function AutomationContent() {
  const { showPaywall: atShow, paywallReason: atReason, paywallFeature: atFeat, closePaywall: atClose, requireFeature: atRequire } = useGateCheck();
  const { rules, loading, addRule, editRule, removeRule } = useAutomationRules();
  const addModal = useModal();
  const [form, setForm] = useState({ name: '', trigger_type: 'schedule', trigger_config: '{}', action_type: 'send_notification', action_config: '{}', is_active: true, priority: 5 });

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    await addRule({ name: form.name.trim(), trigger_type: form.trigger_type, trigger_config: form.trigger_config, action_type: form.action_type, action_config: form.action_config, is_active: form.is_active, priority: form.priority, team_id: '__default__' });
    setForm({ name: '', trigger_type: 'schedule', trigger_config: '{}', action_type: 'send_notification', action_config: '{}', is_active: true, priority: 5 });
    addModal.closeModal();
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Zap size={18} className="text-primary-2" />
        <span className="text-sm font-bold">自动化规则</span>
        <span className="ml-auto text-[10px] text-text-3">{rules.length} 条规则 · {rules.filter((r) => r.is_active).length} 活跃</span>
        <button className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20" onClick={() => { if (!atRequire('customWorkflows', '自动化规则需要专业版或企业版')) return; addModal.openModal(); }}>
          <Plus size={12} />新建规则
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin text-primary-2" /></div>
      ) : rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-text-3">
          <Zap size={32} className="mb-2 opacity-30" />
          <span className="text-xs">暂无自动化规则</span>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((r) => (
            <div key={r.id} className={cn('flex items-center gap-3 rounded-xl border bg-surface px-4 py-3 transition-all hover:shadow-lg', r.is_active ? 'border-border' : 'border-border opacity-60')}>
              <button className="shrink-0" onClick={() => editRule(r.id, { is_active: !r.is_active })} title={r.is_active ? '暂停' : '启用'}>
                {r.is_active ? <Power size={16} className="text-success" /> : <PowerOff size={16} className="text-text-3" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-text">{r.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary-2">
                    {TRIGGER_OPTIONS.find((o) => o.value === r.trigger_type)?.label || r.trigger_type}
                  </span>
                  <span className="text-[9px] text-text-3">{'->'}</span>
                  <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-[9px] font-semibold text-success">
                    {ACTION_OPTIONS.find((o) => o.value === r.action_type)?.label || r.action_type}
                  </span>
                  <span className="text-[10px] text-text-3">优先级: {r.priority}</span>
                </div>
              </div>
              <button className="rounded p-1 text-text-3 hover:bg-danger/10 hover:text-danger" onClick={() => removeRule(r.id)} title="删除">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={addModal.open} onClose={addModal.closeModal} title="新建自动化规则"
        footer={<div className="flex gap-2"><button className={btnSecondary} onClick={addModal.closeModal}>取消</button><button className={btnPrimary} onClick={handleAdd} disabled={!form.name.trim()}>创建</button></div>}
      >
        <ModalField label="规则名称">
          <input className={inputCls} placeholder="输入规则名称" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
        </ModalField>
        <ModalField label="触发类型">
          <select className={inputCls} value={form.trigger_type} onChange={(e) => setForm((p) => ({ ...p, trigger_type: e.target.value }))}>
            {TRIGGER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </ModalField>
        <ModalField label="执行动作">
          <select className={inputCls} value={form.action_type} onChange={(e) => setForm((p) => ({ ...p, action_type: e.target.value }))}>
            {ACTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </ModalField>
        <ModalField label="优先级">
          <input type="number" min={1} max={10} className={inputCls} value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: Number(e.target.value) }))} />
        </ModalField>
      </Modal>
      <PaywallModal open={atShow} onClose={atClose} reason={atReason} feature={atFeat} />
    </div>
  );
}
