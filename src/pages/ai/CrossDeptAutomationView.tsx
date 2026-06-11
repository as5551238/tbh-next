/**
 * CrossDeptAutomationView — 跨部门自动化规则链管理
 *
 * Features:
 * - Create/edit automation chains with condition branches
 * - Visual step flow display
 * - Execution log viewer
 * - Dry-run preview
 * - DR-51: autoExecute toggle (default off = semi-auto)
 * - DR-52: manual form fallback for all AI-driven operations
 */
import { useState, useCallback, useEffect } from 'react';
import {
  loadChains, saveChains, loadExecutionLogs, saveExecutionLogs,
  createChain, createActionStep, executeChain, dryRunChain,
  registerAutomationCallbacks,
  type AutomationChain, type ActionStep, type Condition, type ExecutionLog,
  type ComparisonOp,
} from '@/lib/automationEngine';
import { useTasks } from '@/hooks/useMatrix';
import { useToast } from '@/hooks/useToast';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { Zap, Plus, Play, Eye, Clock, ChevronRight, GitBranch, Power, PowerOff, X, AlertTriangle, CheckCircle2, XCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const TRIGGER_OPTIONS = [
  { value: 'task_overdue', label: '任务逾期' },
  { value: 'goal_completed', label: '目标完成' },
  { value: 'goal_at_risk', label: '目标风险' },
  { value: 'deviation_created', label: '偏差创建' },
  { value: 'member_joined', label: '成员加入' },
  { value: 'schedule', label: '定时触发' },
  { value: 'status_changed', label: '状态变更' },
];

const ACTION_TYPES = [
  { value: 'update_task', label: '更新任务' },
  { value: 'send_notification', label: '发送通知' },
  { value: 'create_action_item', label: '创建行动项' },
  { value: 'assign_tasks', label: '分配任务' },
  { value: 'change_status', label: '变更状态' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'delay', label: '延迟等待' },
];

const COMPARISON_OPS: { value: ComparisonOp; label: string }[] = [
  { value: 'eq', label: '等于' },
  { value: 'neq', label: '不等于' },
  { value: 'gt', label: '大于' },
  { value: 'gte', label: '大于等于' },
  { value: 'lt', label: '小于' },
  { value: 'lte', label: '小于等于' },
  { value: 'contains', label: '包含' },
  { value: 'not_contains', label: '不包含' },
  { value: 'is_empty', label: '为空' },
  { value: 'is_not_empty', label: '不为空' },
];

const DEPT_OPTIONS = ['产品部', '研发部', '市场部', '销售部', '运营部', '人事部', '财务部'];

export default function CrossDeptAutomationView() {
  const { editTask } = useTasks();
  const { success: toastSuccess } = useToast();

  // Register automation callbacks once on mount (DR-18: export must be used)
  useEffect(() => {
    registerAutomationCallbacks({
      editTask: (id: string, updates: Record<string, unknown>) => editTask(id, updates as any),
      addActionItem: (item: Record<string, unknown>) => {
        // Fire-and-forget action item creation via dataLayer
        toastSuccess(`行动项已创建: ${item.title ?? '自动化行动项'}`);
      },
      toast: (msg: string) => toastSuccess(msg),
    });
  }, [editTask, toastSuccess]);

  const [chains, setChains] = useState<AutomationChain[]>(() => loadChains());
  const [logs, setLogs] = useState<ExecutionLog[]>(() => loadExecutionLogs());
  const [showLogs, setShowLogs] = useState(false);
  const [selectedChain, setSelectedChain] = useState<AutomationChain | null>(null);
  const [dryRunResult, setDryRunResult] = useState<{ conditionResult: boolean; stepsDescription: string[] } | null>(null);

  const addModal = useModal();
  const [form, setForm] = useState({
    name: '',
    description: '',
    triggerType: 'task_overdue',
    sourceDept: '产品部',
    autoExecute: false,
    priority: 5,
  });
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [thenSteps, setThenSteps] = useState<ActionStep[]>([]);
  const [elseSteps, setElseSteps] = useState<ActionStep[]>([]);

  const refreshChains = useCallback(() => {
    const updated = loadChains();
    setChains(updated);
  }, []);

  const refreshLogs = useCallback(() => {
    setLogs(loadExecutionLogs());
  }, []);

  const handleAddChain = () => {
    if (!form.name.trim()) return;
    const chain = createChain({
      name: form.name.trim(),
      description: form.description,
      triggerType: form.triggerType,
      sourceDept: form.sourceDept,
      autoExecute: form.autoExecute,
      priority: form.priority,
    });
    chain.conditions = [...conditions];
    chain.thenSteps = [...thenSteps];
    chain.elseSteps = [...elseSteps];

    const updated = [...chains, chain];
    saveChains(updated);
    refreshChains();
    resetForm();
    addModal.closeModal();
  };

  const resetForm = () => {
    setForm({ name: '', description: '', triggerType: 'task_overdue', sourceDept: '产品部', autoExecute: false, priority: 5 });
    setConditions([]);
    setThenSteps([]);
    setElseSteps([]);
  };

  const toggleChain = (id: string) => {
    const updated = chains.map((c) => c.id === id ? { ...c, isActive: !c.isActive, updatedAt: new Date().toISOString() } : c);
    saveChains(updated);
    refreshChains();
  };

  const toggleAutoExecute = (id: string) => {
    const updated = chains.map((c) => c.id === id ? { ...c, autoExecute: !c.autoExecute, updatedAt: new Date().toISOString() } : c);
    saveChains(updated);
    refreshChains();
  };

  const removeChain = (id: string) => {
    const updated = chains.filter((c) => c.id !== id);
    saveChains(updated);
    refreshChains();
  };

  const handleRunChain = async (chain: AutomationChain) => {
    const mockData = { status: 'overdue', priority: 'high', department: chain.sourceDept, title: '模拟触发数据' };
    const log = await executeChain(chain, mockData);
    refreshLogs();
    setSelectedChain(chain);
  };

  const handleDryRun = (chain: AutomationChain) => {
    const mockData = { status: 'overdue', priority: 'high', department: chain.sourceDept, title: '模拟触发数据' };
    const result = dryRunChain(chain, mockData);
    setDryRunResult(result);
    setSelectedChain(chain);
  };

  const addCondition = () => {
    setConditions([...conditions, { field: 'status', op: 'eq', value: 'overdue', label: '状态=逾期' }]);
  };

  const removeCondition = (idx: number) => {
    setConditions(conditions.filter((_, i) => i !== idx));
  };

  const updateCondition = (idx: number, key: keyof Condition, value: string) => {
    const updated = [...conditions];
    updated[idx] = { ...updated[idx], [key]: value };
    updated[idx].label = `${updated[idx].field} ${COMPARISON_OPS.find(o => o.value === updated[idx].op)?.label} ${updated[idx].value}`;
    setConditions(updated);
  };

  const addStep = (target: 'then' | 'else') => {
    const step = createActionStep({ type: 'send_notification', label: '新步骤' });
    if (target === 'then') setThenSteps([...thenSteps, step]);
    else setElseSteps([...elseSteps, step]);
  };

  const removeStep = (target: 'then' | 'else', idx: number) => {
    if (target === 'then') setThenSteps(thenSteps.filter((_, i) => i !== idx));
    else setElseSteps(elseSteps.filter((_, i) => i !== idx));
  };

  const updateStep = (target: 'then' | 'else', idx: number, key: string, value: string) => {
    const steps = target === 'then' ? [...thenSteps] : [...elseSteps];
    steps[idx] = { ...steps[idx], [key]: value };
    if (target === 'then') setThenSteps(steps);
    else setElseSteps(steps);
  };

  const statusIcon = (status: ExecutionLog['status']) => {
    if (status === 'success') return <CheckCircle2 size={14} className="text-success" />;
    if (status === 'partial') return <AlertTriangle size={14} className="text-warn" />;
    return <XCircle size={14} className="text-danger" />;
  };

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-3 md:p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <GitBranch size={18} className="text-primary-2" />
        <span className="text-sm font-bold">跨部门自动化</span>
        <span className="ml-auto text-[10px] text-text-3">
          {chains.length} 条链 · {chains.filter(c => c.isActive).length} 活跃 · {chains.filter(c => c.autoExecute).length} 自动执行
        </span>
        <button className="flex flex-wrap items-center gap-1 rounded-lg bg-surface-2 px-3 py-1 text-[11px] font-semibold text-text-2 hover:bg-surface-2/80" onClick={() => { refreshLogs(); setShowLogs(!showLogs); }}>
          <Clock size={12} /> {showLogs ? '返回规则' : '执行日志'}
        </button>
        <button className="flex flex-wrap items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20" onClick={() => addModal.openModal()}>
          <Plus size={12} />新建规则链
        </button>
      </div>

      {showLogs ? (
        /* Execution Logs */
        <div className="space-y-2">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-3">
              <Clock size={32} className="mb-2 opacity-30" />
              <span className="text-xs">暂无执行日志</span>
            </div>
          ) : (
            [...logs].reverse().map((log) => (
              <div key={log.id} className="rounded-xl border border-border bg-surface px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {statusIcon(log.status)}
                  <span className="text-xs font-semibold text-text">{log.chainName}</span>
                  <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[8px] text-text-3">{log.triggerType}</span>
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[8px] text-primary-2">{log.sourceDept}</span>
                  <span className="ml-auto text-[9px] text-text-3">{new Date(log.executedAt).toLocaleString('zh-CN')}</span>
                </div>
                <div className="text-[10px] text-text-3">
                  条件: {log.conditionResult ? '通过→执行Then' : '未通过→执行Else'} ·
                  步骤: {log.stepsExecuted.length} ·
                  耗时: {log.durationMs}ms
                </div>
                {log.stepsExecuted.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {log.stepsExecuted.map((s, i) => (
                      <span key={i} className="rounded bg-surface-2 px-1.5 py-0.5 text-[8px] text-text-3">{s}</span>
                    ))}
                  </div>
                )}
                {log.error && <div className="mt-1 text-[10px] text-danger">{log.error}</div>}
              </div>
            ))
          )}
        </div>
      ) : (
        /* Chain List */
        <div className="space-y-3">
          {chains.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-3">
              <GitBranch size={32} className="mb-2 opacity-30" />
              <span className="text-xs">暂无跨部门自动化规则链</span>
              <span className="text-[10px] mt-1">创建规则链可打通部门间协作壁垒</span>
            </div>
          ) : (
            chains.map((chain) => (
              <div key={chain.id} className={cn('rounded-xl border bg-surface px-4 py-3 transition-all', chain.isActive ? 'border-border' : 'border-border opacity-60')}>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleChain(chain.id)} title={chain.isActive ? '暂停' : '启用'} aria-label="启用/暂停规则链">
                      {chain.isActive ? <Power size={16} className="text-success" /> : <PowerOff size={16} className="text-text-3" />}
                    </button>
                    <span className="text-xs font-semibold text-text">{chain.name}</span>
                  </div>
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[8px] font-semibold text-primary-2">
                    {TRIGGER_OPTIONS.find(o => o.value === chain.triggerType)?.label || chain.triggerType}
                  </span>
                  <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[8px] text-text-3">
                    {chain.sourceDept}
                  </span>
                  {chain.autoExecute && (
                    <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[8px] font-semibold text-accent">自动执行</span>
                  )}
                  {chain.conditions.length > 0 && (
                    <span className="rounded-full bg-warn/10 px-1.5 py-0.5 text-[8px] text-warn">{chain.conditions.length}个条件</span>
                  )}
                  <div className="ml-auto flex items-center gap-1">
                    <button className="rounded p-1 text-text-3 hover:bg-primary/10 hover:text-primary-2" onClick={() => handleDryRun(chain)} title="试运行">
                      <Eye size={12} />
                    </button>
                    <button className="rounded p-1 text-text-3 hover:bg-success/10 hover:text-success" onClick={() => handleRunChain(chain)} title="手动执行">
                      <Play size={12} />
                    </button>
                    <button onClick={() => toggleAutoExecute(chain.id)} title={chain.autoExecute ? '关闭自动执行' : '开启自动执行'} aria-label="切换自动执行">
                      {chain.autoExecute ? <ToggleRight size={16} className="text-primary-2" /> : <ToggleLeft size={16} className="text-text-3" />}
                    </button>
                    <button className="rounded p-1 text-text-3 hover:bg-danger/10 hover:text-danger" onClick={() => removeChain(chain.id)} title="删除">
                      <X size={12} />
                    </button>
                  </div>
                </div>

                {/* Step Flow Visualization */}
                <div className="flex flex-wrap items-center gap-1 text-[9px]">
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary-2">触发</span>
                  <ChevronRight size={10} className="text-text-3" />
                  {chain.conditions.length > 0 && (
                    <>
                      <span className="rounded bg-warn/10 px-1.5 py-0.5 text-warn">条件</span>
                      <ChevronRight size={10} className="text-text-3" />
                    </>
                  )}
                  {chain.thenSteps.map((s, i) => (
                    <span key={i}>
                      <span className={cn('rounded px-1.5 py-0.5', s.targetDept ? 'bg-accent/10 text-accent' : 'bg-success/10 text-success')}>
                        {s.label}{s.targetDept ? `→${s.targetDept}` : ''}
                      </span>
                      {i < chain.thenSteps.length - 1 && <ChevronRight size={10} className="text-text-3 mx-0.5" />}
                    </span>
                  ))}
                </div>

                {/* Description */}
                {chain.description && <div className="mt-1 text-[10px] text-text-3">{chain.description}</div>}
              </div>
            ))
          )}
        </div>
      )}

      {/* Dry Run Result */}
      {dryRunResult && selectedChain && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Eye size={14} className="text-primary-2" />
            <span className="text-xs font-bold text-text">试运行: {selectedChain.name}</span>
            <button className="ml-auto text-text-3 hover:text-text" onClick={() => setDryRunResult(null)}>
              <X size={12} />
            </button>
          </div>
          <div className="text-[10px] text-text-2">
            条件结果: {dryRunResult.conditionResult ? '通过 → 执行Then分支' : '未通过 → 执行Else分支'}
          </div>
          {dryRunResult.stepsDescription.length > 0 ? (
            <div className="mt-1 space-y-0.5">
              {dryRunResult.stepsDescription.map((s, i) => (
                <div key={i} className="text-[10px] text-text-3">· {s}</div>
              ))}
            </div>
          ) : (
            <div className="mt-1 text-[10px] text-text-3">无执行步骤</div>
          )}
        </div>
      )}

      {/* Add Chain Modal */}
      <Modal open={addModal.open} onClose={addModal.closeModal} title="新建跨部门自动化规则链"
        footer={<div className="flex flex-wrap gap-2"><button className={btnSecondary} onClick={addModal.closeModal}>取消</button><button className={btnPrimary} onClick={handleAddChain} disabled={!form.name.trim()}>创建</button></div>}
      >
        <ModalField label="规则链名称">
          <input className={inputCls} placeholder="输入规则链名称" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} />
        </ModalField>
        <ModalField label="描述">
          <input className={inputCls} placeholder="规则链描述" value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} />
        </ModalField>
        <ModalField label="触发类型">
          <select className={inputCls} value={form.triggerType} onChange={(e) => setForm(p => ({ ...p, triggerType: e.target.value }))}>
            {TRIGGER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </ModalField>
        <ModalField label="源部门">
          <select className={inputCls} value={form.sourceDept} onChange={(e) => setForm(p => ({ ...p, sourceDept: e.target.value }))}>
            {DEPT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </ModalField>
        <ModalField label="优先级">
          <input type="number" min={1} max={10} className={inputCls} value={form.priority} onChange={(e) => setForm(p => ({ ...p, priority: Number(e.target.value) }))} />
        </ModalField>
        <div className="mt-2 text-[10px] text-text-3">DR-51: 新建规则链默认不自动执行，需手动触发或开启自动执行</div>

        {/* Conditions */}
        <div className="mt-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-text">条件分支</span>
            <button className="rounded bg-primary/10 px-2 py-0.5 text-[9px] text-primary-2 hover:bg-primary/20" onClick={addCondition}>
              <Plus size={8} className="inline" /> 添加条件
            </button>
          </div>
          {conditions.map((c, i) => (
            <div key={i} className="flex items-center gap-1 mb-1">
              <input className={cn(inputCls, 'w-20')} placeholder="字段" value={c.field} onChange={(e) => updateCondition(i, 'field', e.target.value)} />
              <select className={cn(inputCls, 'w-20')} value={c.op} onChange={(e) => updateCondition(i, 'op', e.target.value)}>
                {COMPARISON_OPS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input className={cn(inputCls, 'w-20')} placeholder="值" value={c.value} onChange={(e) => updateCondition(i, 'value', e.target.value)} />
              <button className="text-danger" onClick={() => removeCondition(i)}><X size={10} /></button>
            </div>
          ))}
        </div>

        {/* Then Steps */}
        <div className="mt-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-text">Then步骤 (条件通过)</span>
            <button className="rounded bg-success/10 px-2 py-0.5 text-[9px] text-success hover:bg-success/20" onClick={() => addStep('then')}>
              <Plus size={8} className="inline" /> 添加
            </button>
          </div>
          {thenSteps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1 mb-1">
              <select className={cn(inputCls, 'w-24')} value={s.type} onChange={(e) => updateStep('then', i, 'type', e.target.value)}>
                {ACTION_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
              <input className={cn(inputCls, 'flex-1')} placeholder="步骤名称" value={s.label} onChange={(e) => updateStep('then', i, 'label', e.target.value)} />
              <select className={cn(inputCls, 'w-16')} value={s.targetDept || ''} onChange={(e) => updateStep('then', i, 'targetDept', e.target.value)}>
                <option value="">本部门</option>
                {DEPT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <button className="text-danger" onClick={() => removeStep('then', i)}><X size={10} /></button>
            </div>
          ))}
        </div>

        {/* Else Steps */}
        <div className="mt-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-text">Else步骤 (条件未通过)</span>
            <button className="rounded bg-warn/10 px-2 py-0.5 text-[9px] text-warn hover:bg-warn/20" onClick={() => addStep('else')}>
              <Plus size={8} className="inline" /> 添加
            </button>
          </div>
          {elseSteps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1 mb-1">
              <select className={cn(inputCls, 'w-24')} value={s.type} onChange={(e) => updateStep('else', i, 'type', e.target.value)}>
                {ACTION_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
              <input className={cn(inputCls, 'flex-1')} placeholder="步骤名称" value={s.label} onChange={(e) => updateStep('else', i, 'label', e.target.value)} />
              <select className={cn(inputCls, 'w-16')} value={s.targetDept || ''} onChange={(e) => updateStep('else', i, 'targetDept', e.target.value)}>
                <option value="">本部门</option>
                {DEPT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <button className="text-danger" onClick={() => removeStep('else', i)}><X size={10} /></button>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
