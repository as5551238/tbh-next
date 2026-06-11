import { useGateCheck } from '@/hooks/useGateCheck';
import PaywallModal from '@/components/PaywallModal';
import { hasFeature } from '@/lib/subscription'; // gate: Pro feature check
/**
 * AutomationContent — 自动化规则管理 (v2.9.5)
 * - trigger_config / action_config JSON editor
 * - Manual trigger & dry-run
 * - Execution log panel
 */
import { useState, useCallback } from 'react';
import { useAutomationRules } from '@/hooks/useMatrix';
import type { AutomationRuleRow } from '@/lib/dataLayer';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { Zap, Plus, Power, PowerOff, X, Play, Eye, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CardSkeleton } from '@/components/Skeleton';
import { trackEvent } from '@/lib/behaviorTracker';
import {
  executeChain, loadExecutionLogs, dryRunChain,
  createChain, createActionStep, loadChains, saveChains,
  type AutomationChain, type ExecutionLog, type ActionStep,
} from '@/lib/automationEngine';

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

const STEP_TYPE_OPTIONS = [
  { value: 'send_notification', label: '发送通知' },
  { value: 'update_task', label: '更新任务' },
  { value: 'create_action_item', label: '创建行动项' },
  { value: 'assign_tasks', label: '分配任务' },
  { value: 'change_status', label: '变更状态' },
  { value: 'delay', label: '延时' },
];

const STATUS_COLORS: Record<ExecutionLog['status'], string> = {
  success: 'text-success bg-success/10',
  partial: 'text-warning bg-warning/10',
  failed: 'text-danger bg-danger/10',
};

/** Small JSON editor textarea with validation */
function JsonEditor({ value, onChange, label, placeholder }: { value: string; onChange: (v: string) => void; label: string; placeholder?: string }) {
  const [err, setErr] = useState('');
  const handle = (v: string) => {
    onChange(v);
    try { if (v.trim()) JSON.parse(v); setErr(''); } catch (e) { setErr('JSON 格式错误'); }
  };
  return (
    <ModalField label={label}>
      <textarea
        className={cn(inputCls, 'min-h-[60px] font-mono text-[11px]', err && 'border-danger')}
        placeholder={placeholder ?? '{}'}
        value={value}
        rows={3}
        onChange={(e) => handle(e.target.value)}
      />
      {err && <div className="text-[10px] text-danger mt-0.5">{err}</div>}
    </ModalField>
  );
}

export default function AutomationContent() {
  const { showPaywall: atShow, paywallReason: atReason, paywallFeature: atFeat, closePaywall: atClose, requireFeature: atRequire } = useGateCheck();
  const { rules, loading, addRule, editRule, removeRule } = useAutomationRules();
  const addModal = useModal();
  const logModal = useModal();
  const [form, setForm] = useState({ name: '', trigger_type: 'schedule', trigger_config: '{}', action_type: 'send_notification', action_config: '{}', is_active: true, priority: 5 });
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [logOpen, setLogOpen] = useState(false);

  // Execution log panel
  const showLogs = useCallback(() => {
    setLogs(loadExecutionLogs().reverse());
    setLogOpen(!logOpen);
  }, [logOpen]);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    await addRule({ name: form.name.trim(), trigger_type: form.trigger_type, trigger_config: form.trigger_config, action_type: form.action_type, action_config: form.action_config, is_active: form.is_active, priority: form.priority, team_id: '__default__' });
    trackEvent('automation_rule_create', { name: form.name, trigger: form.trigger_type, action: form.action_type });
    setForm({ name: '', trigger_type: 'schedule', trigger_config: '{}', action_type: 'send_notification', action_config: '{}', is_active: true, priority: 5 });
    addModal.closeModal();
  };

  // Convert DB rule to chain and execute/dry-run
  const buildChainFromRule = (r: AutomationRuleRow): AutomationChain => {
    let trigCfg: Record<string, unknown> = {};
    let actCfg: Record<string, unknown> = {};
    try { trigCfg = JSON.parse(r.trigger_config || '{}'); } catch { /* keep empty */ }
    try { actCfg = JSON.parse(r.action_config || '{}'); } catch { /* keep empty */ }
    return createChain({
      name: r.name,
      triggerType: r.trigger_type,
      triggerConfig: trigCfg,
      isActive: r.is_active,
      priority: r.priority,
      thenSteps: [createActionStep({ type: r.action_type as ActionStep['type'], label: r.action_type, config: actCfg })],
    });
  };

  const handleExecute = async (r: AutomationRuleRow) => {
    const chain = buildChainFromRule(r);
    const log = await executeChain(chain, { source: 'manual_trigger', rule_id: r.id });
    trackEvent('automation_rule_execute', { id: r.id, name: r.name });
    setLogs((prev) => [log, ...prev]);
    setLogOpen(true);
  };

  const handleDryRun = (r: AutomationRuleRow) => {
    const chain = buildChainFromRule(r);
    const result = dryRunChain(chain, { source: 'dry_run', rule_id: r.id });
    const previewLog: ExecutionLog = {
      id: `dry_${Date.now()}`,
      chainId: r.id,
      chainName: r.name,
      triggerType: r.trigger_type,
      sourceDept: '',
      conditionResult: result.conditionResult,
      stepsExecuted: result.stepsDescription,
      status: 'success',
      executedAt: new Date().toISOString(),
      durationMs: 0,
    };
    setLogs((prev) => [previewLog, ...prev]);
    setLogOpen(true);
  };

  // Derive action_config placeholder based on action_type
  const actionPlaceholder = (type: string) => {
    switch (type) {
      case 'send_notification': return '{"message": "通知内容"}';
      case 'update_task': return '{"taskId": "xxx", "updates": {"status": "done"}}';
      case 'create_action_item': return '{"title": "行动项标题", "assignee_id": ""}';
      case 'assign_tasks': return '{"taskId": "xxx", "assignee_id": ""}';
      case 'change_status': return '{"taskId": "xxx", "status": "in_progress"}';
      default: return '{}';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <Zap size={18} className="text-primary-2" />
        <span className="text-sm font-bold">自动化规则</span>
        <span className="ml-auto text-[10px] text-text-3">{rules.length} 条规则 · {rules.filter((r) => r.is_active).length} 活跃</span>
        <button className="flex flex-wrap items-center gap-1 rounded-lg bg-surface-2/60 px-2.5 py-1 text-[11px] font-semibold text-text-2 hover:bg-surface-2" onClick={showLogs}>
          <FileText size={12} />执行日志
          {logOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </button>
        <button className="flex flex-wrap items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20" onClick={() => { if (!atRequire('customWorkflows', '自动化规则需要专业版或企业版')) return; addModal.openModal(); }}>
          <Plus size={12} />新建规则
        </button>
      </div>

      {/* Execution log panel */}
      {logOpen && (
        <div className="rounded-xl border bg-surface p-3 space-y-2 max-h-[240px] overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-text">执行日志</span>
            <span className="text-[10px] text-text-3">{logs.length} 条记录</span>
          </div>
          {logs.length === 0 ? (
            <div className="text-[10px] text-text-3 py-4 text-center">暂无执行记录</div>
          ) : (
            <div className="space-y-1.5">
              {logs.slice(0, 20).map((l) => (
                <div key={l.id} className="flex items-start gap-2 rounded-lg bg-surface-2/40 px-2.5 py-2">
                  <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold', STATUS_COLORS[l.status])}>{l.status === 'success' ? '成功' : l.status === 'partial' ? '部分' : '失败'}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-medium text-text truncate">{l.chainName}</div>
                    <div className="text-[9px] text-text-3 mt-0.5">
                      {l.stepsExecuted.join(', ') || '无步骤'}
                      {l.error && <span className="text-danger ml-1">{l.error}</span>}
                    </div>
                    <div className="text-[9px] text-text-3 mt-0.5">{new Date(l.executedAt).toLocaleString()}{l.durationMs > 0 ? ` · ${l.durationMs}ms` : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <CardSkeleton />
      ) : rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-text-3">
          <Zap size={32} className="mb-2 opacity-30" />
          <span className="text-xs">暂无自动化规则</span>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((r) => (
            <div key={r.id} className={cn('flex items-center gap-3 rounded-xl border bg-surface px-4 py-3 transition-all hover:shadow-lg', r.is_active ? 'border-border' : 'border-border opacity-60')}>
              <button className="shrink-0" onClick={() => editRule(r.id, { is_active: !r.is_active })} title={r.is_active ? '暂停' : '启用'} aria-label="启用/暂停规则">
                {r.is_active ? <Power size={16} className="text-success" /> : <PowerOff size={16} className="text-text-3" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-text">{r.name}</div>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary-2">
                    {TRIGGER_OPTIONS.find((o) => o.value === r.trigger_type)?.label || r.trigger_type}
                  </span>
                  <span className="text-[9px] text-text-3">{'->'}</span>
                  <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-[9px] font-semibold text-success">
                    {ACTION_OPTIONS.find((o) => o.value === r.action_type)?.label || r.action_type}
                  </span>
                  <span className="text-[10px] text-text-3">优先级: {r.priority}</span>
                </div>
                {/* Show config preview if non-trivial */}
                {r.trigger_config && r.trigger_config !== '{}' && (
                  <div className="text-[9px] text-text-3 mt-1 truncate max-w-full">触发: {r.trigger_config}</div>
                )}
                {r.action_config && r.action_config !== '{}' && (
                  <div className="text-[9px] text-text-3 truncate max-w-full">动作: {r.action_config}</div>
                )}
              </div>
              {/* Action buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <button className="rounded p-1 text-text-3 hover:bg-primary/10 hover:text-primary-2" onClick={() => handleDryRun(r)} title="干运行预览" aria-label="干运行">
                  <Eye size={13} />
                </button>
                <button className="rounded p-1 text-text-3 hover:bg-success/10 hover:text-success" onClick={() => handleExecute(r)} title="手动执行" aria-label="手动执行">
                  <Play size={13} />
                </button>
                <button className="rounded p-1 text-text-3 hover:bg-danger/10 hover:text-danger" onClick={() => removeRule(r.id)} title="删除" aria-label="删除规则">
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={addModal.open} onClose={addModal.closeModal} title="新建自动化规则"
        footer={<div className="flex flex-wrap gap-2"><button className={btnSecondary} onClick={addModal.closeModal}>取消</button><button className={btnPrimary} onClick={handleAdd} disabled={!form.name.trim()}>创建</button></div>}
      >
        <ModalField label="规则名称">
          <input className={inputCls} placeholder="输入规则名称" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
        </ModalField>
        <ModalField label="触发类型">
          <select className={inputCls} value={form.trigger_type} onChange={(e) => setForm((p) => ({ ...p, trigger_type: e.target.value }))}>
            {TRIGGER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </ModalField>
        <JsonEditor
          label="触发配置 (JSON)"
          value={form.trigger_config}
          onChange={(v) => setForm((p) => ({ ...p, trigger_config: v }))}
          placeholder={form.trigger_type === 'schedule' ? '{"cron": "0 9 * * 1", "timezone": "Asia/Shanghai"}' : '{"field": "status", "op": "eq", "value": "done"}'}
        />
        <ModalField label="执行动作">
          <select className={inputCls} value={form.action_type} onChange={(e) => setForm((p) => ({ ...p, action_type: e.target.value }))}>
            {ACTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </ModalField>
        <JsonEditor
          label="动作配置 (JSON)"
          value={form.action_config}
          onChange={(v) => setForm((p) => ({ ...p, action_config: v }))}
          placeholder={actionPlaceholder(form.action_type)}
        />
        <ModalField label="优先级 (1-10)">
          <input type="number" min={1} max={10} className={inputCls} value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: Number(e.target.value) }))} />
        </ModalField>
      </Modal>
      <PaywallModal open={atShow} onClose={atClose} reason={atReason} feature={atFeat} />
    </div>
  );
}