/**
 * Cross-department Automation Engine
 *
 * Enables rule chaining across departments with:
 * - Condition branches (if/else)
 * - Multi-step action sequences
 * - Cross-dept event propagation
 * - Execution logging
 * - Dry-run mode (DR-51: toggle support)
 *
 * DR-52: All AI-driven automations have manual form fallback.
 * DR-51: Auto features support toggle, default low-disturbance mode.
 */

// ── Types ─────────────────────────────────────────────────────────────

export type ComparisonOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty';

export interface Condition {
  field: string;
  op: ComparisonOp;
  value: string;
  /** Human-readable label for UI */
  label?: string;
}

export interface ActionStep {
  id: string;
  type: 'update_task' | 'send_notification' | 'create_action_item' | 'assign_tasks' | 'change_status' | 'webhook' | 'delay';
  config: Record<string, unknown>;
  /** Target department ID; empty = same department as trigger */
  targetDept?: string;
  label: string;
}

export interface AutomationChain {
  id: string;
  name: string;
  description: string;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  /** Source department for trigger */
  sourceDept: string;
  conditions: Condition[];
  /** If conditions pass, execute thenSteps; else execute elseSteps */
  thenSteps: ActionStep[];
  elseSteps: ActionStep[];
  isActive: boolean;
  priority: number;
  /** DR-51: enable/disable auto execution, default false = semi-auto */
  autoExecute: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionLog {
  id: string;
  chainId: string;
  chainName: string;
  triggerType: string;
  sourceDept: string;
  conditionResult: boolean;
  stepsExecuted: string[];
  status: 'success' | 'partial' | 'failed';
  error?: string;
  executedAt: string;
  durationMs: number;
}

// ── Condition Evaluator ────────────────────────────────────────────────

export function evaluateCondition(condition: Condition, data: Record<string, unknown>): boolean {
  const val = data[condition.field];
  const target = condition.value;

  switch (condition.op) {
    case 'eq': return String(val) === target;
    case 'neq': return String(val) !== target;
    case 'gt': return Number(val) > Number(target);
    case 'gte': return Number(val) >= Number(target);
    case 'lt': return Number(val) < Number(target);
    case 'lte': return Number(val) <= Number(target);
    case 'contains': return String(val).includes(target);
    case 'not_contains': return !String(val).includes(target);
    case 'is_empty': return val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
    case 'is_not_empty': return val !== undefined && val !== null && val !== '' && !(Array.isArray(val) && val.length === 0);
    default: return false;
  }
}

export function evaluateAllConditions(conditions: Condition[], data: Record<string, unknown>): boolean {
  if (conditions.length === 0) return true;
  return conditions.every((c) => evaluateCondition(c, data));
}

// ── Action Executor (real execution via dataLayer) ────────────────────────

// Lazy import to avoid circular dependency at module load time
let _editTask: ((id: string, updates: Record<string, unknown>) => void) | null = null;
let _addActionItem: ((item: Record<string, unknown>) => void) | null = null;
let _toastFn: ((msg: string) => void) | null = null;

/** Register dataLayer callbacks — called once at app boot from a top-level component */
export function registerAutomationCallbacks(callbacks: {
  editTask: (id: string, updates: Record<string, unknown>) => void;
  addActionItem: (item: Record<string, unknown>) => void;
  toast: (msg: string) => void;
}): void {
  _editTask = callbacks.editTask;
  _addActionItem = callbacks.addActionItem;
  _toastFn = callbacks.toast;
}

export async function executeStep(step: ActionStep, context: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
  switch (step.type) {
    case 'update_task': {
      const taskId = String(step.config.taskId ?? context.task_id ?? '');
      const updates = (step.config.updates ?? {}) as Record<string, unknown>;
      if (!taskId || !_editTask) {
        return { success: false, error: _editTask ? `No task ID in step/config` : 'editTask callback not registered' };
      }
      try {
        _editTask(taskId, updates);
        return { success: true };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    }
    case 'send_notification': {
      const message = String(step.config.message ?? '自动化通知触发');
      if (_toastFn) {
        _toastFn(message);
      }
      return { success: true };
    }
    case 'create_action_item': {
      const title = String(step.config.title ?? '自动化行动项');
      const item = {
        title,
        assignee_id: String(step.config.assignee_id ?? context.assignee_id ?? ''),
        due_date: String(step.config.due_date ?? ''),
        status: 'pending',
        source: 'automation',
      };
      if (!_addActionItem) {
        return { success: false, error: 'addActionItem callback not registered' };
      }
      try {
        _addActionItem(item);
        return { success: true };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    }
    case 'assign_tasks': {
      const taskId = String(step.config.taskId ?? context.task_id ?? '');
      const assigneeId = String(step.config.assignee_id ?? '');
      if (!taskId || !_editTask) {
        return { success: false, error: 'Missing taskId or editTask callback' };
      }
      try {
        _editTask(taskId, { assignee_id: assigneeId });
        return { success: true };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    }
    case 'change_status': {
      const taskId = String(step.config.taskId ?? context.task_id ?? '');
      const newStatus = String(step.config.status ?? '');
      if (!taskId || !_editTask) {
        return { success: false, error: 'Missing taskId or editTask callback' };
      }
      try {
        _editTask(taskId, { status: newStatus });
        return { success: true };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    }
    case 'webhook': {
      // External webhooks remain simulated (no external API access per constraints)
      await new Promise((r) => setTimeout(r, 50));
      return { success: true };
    }
    case 'delay': {
      const ms = Number(step.config.durationMs) || 1000;
      await new Promise((r) => setTimeout(r, Math.min(ms, 5000)));
      return { success: true };
    }
    default:
      return { success: false, error: `Unknown step type: ${step.type}` };
  }
}

// ── Chain Execution Engine ─────────────────────────────────────────────

const EXECUTION_LOGS_KEY = 'tbh-automation-exec-logs';
const CHAINS_KEY = 'tbh-automation-chains';

export function loadChains(): AutomationChain[] {
  try {
    const raw = localStorage.getItem(CHAINS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveChains(chains: AutomationChain[]): void {
  localStorage.setItem(CHAINS_KEY, JSON.stringify(chains));
}

export function loadExecutionLogs(): ExecutionLog[] {
  try {
    const raw = localStorage.getItem(EXECUTION_LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveExecutionLogs(logs: ExecutionLog[]): void {
  // Keep only last 200 logs
  const trimmed = logs.slice(-200);
  localStorage.setItem(EXECUTION_LOGS_KEY, JSON.stringify(trimmed));
}

export async function executeChain(
  chain: AutomationChain,
  triggerData: Record<string, unknown>,
): Promise<ExecutionLog> {
  const start = Date.now();
  const conditionResult = evaluateAllConditions(chain.conditions, triggerData);
  const steps = conditionResult ? chain.thenSteps : chain.elseSteps;
  const executedSteps: string[] = [];
  let status: ExecutionLog['status'] = 'success';
  let errorMsg: string | undefined;

  for (const step of steps) {
    const result = await executeStep(step, triggerData);
    executedSteps.push(`${step.label} (${step.type})`);
    if (!result.success) {
      status = 'partial';
      errorMsg = result.error;
      // Continue executing remaining steps (best-effort)
    }
  }

  if (executedSteps.length === 0) {
    status = 'success'; // No steps to execute = trivially successful
  }

  const log: ExecutionLog = {
    id: `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    chainId: chain.id,
    chainName: chain.name,
    triggerType: chain.triggerType,
    sourceDept: chain.sourceDept,
    conditionResult,
    stepsExecuted: executedSteps,
    status,
    error: errorMsg,
    executedAt: new Date().toISOString(),
    durationMs: Date.now() - start,
  };

  const logs = loadExecutionLogs();
  logs.push(log);
  saveExecutionLogs(logs);

  return log;
}

/** Dry-run a chain without executing actions (preview what would happen) */
export function dryRunChain(
  chain: AutomationChain,
  triggerData: Record<string, unknown>,
): { conditionResult: boolean; stepsDescription: string[] } {
  const conditionResult = evaluateAllConditions(chain.conditions, triggerData);
  const steps = conditionResult ? chain.thenSteps : chain.elseSteps;
  return {
    conditionResult,
    stepsDescription: steps.map((s) => `[${s.type}] ${s.label}${s.targetDept ? ` → ${s.targetDept}` : ''}`),
  };
}

// ── Helper Factories ───────────────────────────────────────────────────

let _chainCounter = 0;

export function createChain(partial: Partial<AutomationChain> & { name: string }): AutomationChain {
  _chainCounter++;
  return {
    id: `chain_${Date.now()}_${_chainCounter}`,
    name: partial.name,
    description: partial.description ?? '',
    triggerType: partial.triggerType ?? 'task_overdue',
    triggerConfig: partial.triggerConfig ?? {},
    sourceDept: partial.sourceDept ?? '',
    conditions: partial.conditions ?? [],
    thenSteps: partial.thenSteps ?? [],
    elseSteps: partial.elseSteps ?? [],
    isActive: partial.isActive ?? false,
    priority: partial.priority ?? 5,
    autoExecute: partial.autoExecute ?? false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function createActionStep(partial: Partial<ActionStep> & { type: ActionStep['type']; label: string }): ActionStep {
  return {
    id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: partial.type,
    config: partial.config ?? {},
    targetDept: partial.targetDept,
    label: partial.label,
  };
}

// ── Usage Alert System ─────────────────────────────────────────────────

export interface UsageAlert {
  id: string;
  type: 'threshold_warning' | 'threshold_critical' | 'downgrade_blocked' | 'quota_exceeded';
  metric: string;
  current: number;
  limit: number;
  plan: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

const USAGE_ALERTS_KEY = 'tbh-usage-alerts';

export function loadUsageAlerts(): UsageAlert[] {
  try {
    const raw = localStorage.getItem(USAGE_ALERTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveUsageAlerts(alerts: UsageAlert[]): void {
  // Keep only last 50 alerts
  const trimmed = alerts.slice(-50);
  localStorage.setItem(USAGE_ALERTS_KEY, JSON.stringify(trimmed));
}

/** Check usage against limits and generate alerts */
export function checkUsageAndAlert(usage: { current: number; limit: number; metric: string; plan: string }[]): UsageAlert[] {
  const existing = loadUsageAlerts();
  const newAlerts: UsageAlert[] = [];

  for (const u of usage) {
    if (u.limit === -1) continue; // unlimited
    const pct = (u.current / u.limit) * 100;

    // Deduplicate: don't create duplicate alerts for same metric within 1 hour
    const recentDuplicate = existing.find(
      (a) => a.metric === u.metric && a.type.includes('threshold') && (Date.now() - new Date(a.createdAt).getTime()) < 3600000
    );
    if (recentDuplicate) continue;

    if (pct >= 100) {
      newAlerts.push({
        id: `alert_${Date.now()}_${u.metric}`,
        type: 'quota_exceeded',
        metric: u.metric,
        current: u.current,
        limit: u.limit,
        plan: u.plan,
        message: `${u.metric}已达上限 ${u.current}/${u.limit}，请升级方案或清理数据`,
        createdAt: new Date().toISOString(),
        isRead: false,
      });
    } else if (pct >= 95) {
      newAlerts.push({
        id: `alert_${Date.now()}_${u.metric}`,
        type: 'threshold_critical',
        metric: u.metric,
        current: u.current,
        limit: u.limit,
        plan: u.plan,
        message: `${u.metric}即将达上限 ${u.current}/${u.limit}（${pct.toFixed(0)}%），建议立即处理`,
        createdAt: new Date().toISOString(),
        isRead: false,
      });
    } else if (pct >= 80) {
      newAlerts.push({
        id: `alert_${Date.now()}_${u.metric}`,
        type: 'threshold_warning',
        metric: u.metric,
        current: u.current,
        limit: u.limit,
        plan: u.plan,
        message: `${u.metric}使用率 ${pct.toFixed(0)}%（${u.current}/${u.limit}），建议规划扩容`,
        createdAt: new Date().toISOString(),
        isRead: false,
      });
    }
  }

  if (newAlerts.length > 0) {
    const all = [...existing, ...newAlerts];
    saveUsageAlerts(all);
  }

  return newAlerts;
}

/** Downgrade protection: check if downgrade would cause data loss */
export function canDowngrade(
  currentPlan: string,
  targetPlan: string,
  usage: { metric: string; current: number }[],
): { canDowngrade: boolean; blockers: string[] } {
  if (currentPlan === targetPlan) return { canDowngrade: true, blockers: [] };

  // Inline plan limits to avoid circular import
  const TARGET_LIMITS: Record<string, Record<string, number>> = {
    free: { aiQueriesPerDay: 50, maxAgents: 3, maxTeamMembers: 5, maxProjects: 5, maxGoals: 5, maxTasks: 20, maxDocs: 20 },
    pro: { aiQueriesPerDay: 500, maxAgents: 10, maxTeamMembers: 50, maxProjects: 50, maxGoals: 50, maxTasks: 500, maxDocs: 500 },
    enterprise: { aiQueriesPerDay: -1, maxAgents: -1, maxTeamMembers: -1, maxProjects: -1, maxGoals: -1, maxTasks: -1, maxDocs: -1 },
  };

  const targetLimits = TARGET_LIMITS[targetPlan] ?? TARGET_LIMITS.free;
  const blockers: string[] = [];

  const limitKey: Record<string, string> = {
    'AI查询': 'aiQueriesPerDay',
    'Agent': 'maxAgents',
    '团队成员': 'maxTeamMembers',
    '项目': 'maxProjects',
    '目标': 'maxGoals',
    '任务': 'maxTasks',
    '文档': 'maxDocs',
  };

  for (const u of usage) {
    const key = limitKey[u.metric];
    if (!key) continue;
    const targetLimit = targetLimits[key] as number;
    if (targetLimit !== -1 && u.current > targetLimit) {
      blockers.push(`${u.metric}: 当前${u.current}超出${targetPlan}上限${targetLimit}，需先减少至${targetLimit}以下`);
    }
  }

  return { canDowngrade: blockers.length === 0, blockers };
}
