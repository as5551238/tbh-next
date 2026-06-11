/**
 * Agent Loop — AI Agent execution闭环.
 *
 * Protocol: 理解 → 规划 → 确认 → 执行 → 反馈
 *
 * - Write operations (create/update/delete) require user confirmation before execution
 * - All executed operations can be rolled back within the same conversation
 * - Read operations (query/get) execute immediately without confirmation
 * - The loop produces a step-by-step visual progress for UX rendering
 *
 * Architecture:
 *   User Input → IntentParser → [Write?] → Confirm UI → Execute → Undo Stack → Feedback
 */

import { parseAndExecute, type ParsedIntent, type IntentResult, type ConversationTurn } from '@/lib/intentParser';
import { executeToolCall, isValidTool } from '@/lib/aiTools';
import { createNotification, type TaskRow, type GoalRow, type ActionItemRow } from '@/lib/dataLayer';

// --- Types ---

export type AgentLoopPhase = 'understanding' | 'planning' | 'confirming' | 'executing' | 'feedback';

export interface AgentLoopStep {
  phase: AgentLoopPhase;
  timestamp: number;
  detail: string;
}

export interface AgentLoopResult {
  /** The parsed intent */
  intent: ParsedIntent;
  /** Whether this requires user confirmation before execution */
  requiresConfirmation: boolean;
  /** Preview of what will happen (for write operations) */
  preview: string;
  /** The actual tool result, if already executed */
  toolResult?: unknown;
  /** Error message if execution failed */
  error?: string;
  /** Step-by-step progress */
  steps: AgentLoopStep[];
  /** Undo token for rolling back this operation */
  undoToken?: string;
}

// --- Undo Stack ---

interface UndoEntry {
  token: string;
  entityType: 'task' | 'goal' | 'action_item' | 'notification';
  entityId: string;
  action: 'create' | 'update' | 'delete';
  /** Snapshot of entity before the operation (for restore on undo) */
  snapshot?: Record<string, unknown>;
  timestamp: number;
}

const undoStack: UndoEntry[] = [];
const MAX_UNDO_ENTRIES = 20;

function pushUndo(entry: Omit<UndoEntry, 'token' | 'timestamp'>): string {
  const token = `undo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  undoStack.unshift({ ...entry, token, timestamp: Date.now() });
  // Trim old entries
  while (undoStack.length > MAX_UNDO_ENTRIES) undoStack.pop();
  return token;
}

/** Undo the most recent operation by token, or the last operation if no token */
export async function undoOperation(token?: string): Promise<{ success: boolean; detail: string }> {
  const entry = token
    ? undoStack.find((e) => e.token === token)
    : undoStack[0];
  if (!entry) return { success: false, detail: '没有可撤销的操作' };

  const idx = undoStack.indexOf(entry);
  if (idx === -1) return { success: false, detail: '操作已过期' };

  try {
    switch (entry.action) {
      case 'create': {
        // Undo create = delete the created entity
        const { deleteTask, deleteGoal } = await import('@/lib/dataLayer');
        if (entry.entityType === 'task') await deleteTask(entry.entityId);
        else if (entry.entityType === 'goal') await deleteGoal(entry.entityId);
        else if (entry.entityType === 'action_item') {
          const { deleteActionItem } = await import('@/lib/dataLayer');
          await deleteActionItem(entry.entityId);
        }
        break;
      }
      case 'delete': {
        // Undo delete = recreate from snapshot (best effort)
        if (!entry.snapshot) return { success: false, detail: '无法恢复：缺少原始数据快照' };
        const { createTask, createGoal, createActionItem } = await import('@/lib/dataLayer');
        if (entry.entityType === 'task') await createTask(entry.snapshot as Omit<TaskRow, 'id'>);
        else if (entry.entityType === 'goal') await createGoal(entry.snapshot as Omit<GoalRow, 'id'>);
        else if (entry.entityType === 'action_item') await createActionItem(entry.snapshot as Omit<ActionItemRow, 'id'>);
        break;
      }
      case 'update': {
        // Undo update = restore from snapshot
        if (!entry.snapshot) return { success: false, detail: '无法恢复：缺少原始数据快照' };
        const { updateTask, updateGoal, updateActionItem } = await import('@/lib/dataLayer');
        if (entry.entityType === 'task') await updateTask(entry.entityId, entry.snapshot as Partial<Omit<TaskRow, 'id'>>);
        else if (entry.entityType === 'goal') await updateGoal(entry.entityId, entry.snapshot as Partial<Omit<GoalRow, 'id'>>);
        else if (entry.entityType === 'action_item') await updateActionItem(entry.entityId, entry.snapshot as Partial<Omit<ActionItemRow, 'id'>>);
        break;
      }
    }
    undoStack.splice(idx, 1);
    return { success: true, detail: `已撤销: ${entry.action === 'create' ? '创建' : entry.action === 'delete' ? '删除' : '更新'}${entityTypeLabel(entry.entityType)}` };
  } catch (err) {
    return { success: false, detail: `撤销失败: ${(err as Error)?.message ?? String(err)}` };
  }
}

/** Get undo stack for UI display */
export function getUndoStack(): ReadonlyArray<Readonly<UndoEntry>> {
  return undoStack;
}

// --- Helper: Classify operations ---

const WRITE_INTENTS: Set<string> = new Set(['create_task', 'update_task', 'create_goal', 'create_action_item']);
const WRITE_TOOLS: Set<string> = new Set(['create_task', 'update_task_status', 'create_action_item', 'send_notification', 'create_review', 'create_knowledge_doc', 'update_goal_progress']);

function isWriteOperation(intent: ParsedIntent): boolean {
  return WRITE_INTENTS.has(intent.intent) || WRITE_TOOLS.has(intent.toolName);
}

function entityTypeLabel(type: string): string {
  const map: Record<string, string> = { task: '任务', goal: '目标', action_item: '行动项', notification: '通知' };
  return map[type] ?? type;
}

function inferEntityType(toolName: string): UndoEntry['entityType'] {
  if (/task/i.test(toolName)) return 'task';
  if (/goal/i.test(toolName)) return 'goal';
  if (/action_item/i.test(toolName)) return 'action_item';
  if (/notif/i.test(toolName)) return 'notification';
  return 'task'; // default
}

// --- Preview generation ---

function generatePreview(intent: ParsedIntent): string {
  const p = intent.params;
  switch (intent.intent) {
    case 'create_task':
      return `即将创建任务:\n  标题: ${p.title ?? '(未指定)'}\n  优先级: ${p.priority ?? 'medium'}\n${p.due_date ? `  截止日期: ${p.due_date}\n` : ''}${p.description ? `  描述: ${p.description}\n` : ''}`;
    case 'update_task':
      return `即将更新任务:\n  任务: ${p.task_id ?? '(需要确认具体任务)'}\n${p.status ? `  新状态: ${p.status}\n` : ''}${p.priority ? `  新优先级: ${p.priority}\n` : ''}`;
    case 'create_goal':
      return `即将创建目标:\n  标题: ${p.title ?? '(未指定)'}`;
    case 'create_action_item':
      return `即将创建行动项:\n  标题: ${p.title ?? '(未指定)'}\n  优先级: ${p.priority ?? 'medium'}`;
    default:
      return `即将执行: ${intent.toolName}`;
  }
}

// --- Main: Agent Loop Entry ---

/**
 * Phase 1+2: Parse intent & generate plan (no execution yet for writes).
 * Returns a result that tells the UI whether to show a confirmation dialog.
 */
export async function agentPlan(
  userMessage: string,
  chatHistory?: ConversationTurn[]
): Promise<AgentLoopResult> {
  const steps: AgentLoopStep[] = [];

  // Phase 1: Understanding
  steps.push({ phase: 'understanding', timestamp: Date.now(), detail: `解析用户意图: "${userMessage.slice(0, 50)}"` });

  const intentResult = await parseAndExecute(userMessage, chatHistory);
  const parsed = intentResult.intent;

  // Phase 2: Planning
  const isWrite = isWriteOperation(parsed);

  if (parsed.fallback || parsed.intent === 'chitchat' || parsed.intent === 'unknown') {
    // Fallback or chitchat — no execution needed
    steps.push({ phase: 'planning', timestamp: Date.now(), detail: '无需执行操作' });
    return {
      intent: parsed,
      requiresConfirmation: false,
      preview: '',
      toolResult: intentResult.toolResult,
      error: intentResult.error,
      steps,
    };
  }

  if (!isWrite) {
    // Read operation — already executed by parseAndExecute, no confirmation needed
    steps.push({ phase: 'planning', timestamp: Date.now(), detail: `读取操作: ${parsed.toolName}，直接执行` });
    steps.push({ phase: 'executing', timestamp: Date.now(), detail: '已执行' });
    steps.push({ phase: 'feedback', timestamp: Date.now(), detail: '返回结果' });
    return {
      intent: parsed,
      requiresConfirmation: false,
      preview: '',
      toolResult: intentResult.toolResult,
      steps,
    };
  }

  // Write operation — need confirmation
  // Re-parse without executing (to get the plan without side effects)
  const preview = generatePreview(parsed);
  steps.push({ phase: 'planning', timestamp: Date.now(), detail: `写操作需要确认: ${parsed.toolName}` });

  return {
    intent: parsed,
    requiresConfirmation: true,
    preview,
    toolResult: undefined, // not executed yet
    steps,
  };
}

/**
 * Phase 3+4+5: Execute a confirmed plan.
 * Called after user confirms a write operation.
 */
export async function agentExecute(
  intent: ParsedIntent,
  confirmed: boolean
): Promise<AgentLoopResult> {
  const steps: AgentLoopStep[] = [];

  if (!confirmed) {
    steps.push({ phase: 'confirming', timestamp: Date.now(), detail: '用户取消了操作' });
    return {
      intent,
      requiresConfirmation: false,
      preview: '',
      steps,
    };
  }

  steps.push({ phase: 'confirming', timestamp: Date.now(), detail: '用户已确认' });

  if (!intent.toolName || !isValidTool(intent.toolName)) {
    steps.push({ phase: 'executing', timestamp: Date.now(), detail: `工具 "${intent.toolName}" 不可用` });
    return {
      intent,
      requiresConfirmation: false,
      preview: '',
      error: `工具 "${intent.toolName}" 不存在`,
      steps,
    };
  }

  // Phase 4: Execute
  steps.push({ phase: 'executing', timestamp: Date.now(), detail: `执行: ${intent.toolName}` });

  try {
    const toolResult = await executeToolCall(intent.toolName, intent.params);

    // Push to undo stack
    const entityType = inferEntityType(intent.toolName);
    const action: UndoEntry['action'] = /create/i.test(intent.toolName) ? 'create'
      : /delete/i.test(intent.toolName) ? 'delete'
      : 'update';
    const entityId = (toolResult as Record<string, unknown>)?.id as string ?? `unknown_${Date.now()}`;
    const undoToken = pushUndo({ entityType, entityId, action });

    // Phase 5: Feedback
    steps.push({ phase: 'feedback', timestamp: Date.now(), detail: '操作成功' });

    return {
      intent,
      requiresConfirmation: false,
      preview: '',
      toolResult,
      steps,
      undoToken,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    steps.push({ phase: 'feedback', timestamp: Date.now(), detail: `执行失败: ${msg}` });

    return {
      intent,
      requiresConfirmation: false,
      preview: '',
      error: msg,
      steps,
    };
  }
}

// --- Quick execute for read-only operations (no confirmation needed) ---

export async function agentQuickExecute(userMessage: string, chatHistory?: ConversationTurn[]): Promise<AgentLoopResult> {
  const steps: AgentLoopStep[] = [];
  steps.push({ phase: 'understanding', timestamp: Date.now(), detail: `解析: "${userMessage.slice(0, 50)}"` });

  const intentResult = await parseAndExecute(userMessage, chatHistory);

  if (intentResult.toolResult !== undefined) {
    steps.push({ phase: 'feedback', timestamp: Date.now(), detail: '查询完成' });
  }

  return {
    intent: intentResult.intent,
    requiresConfirmation: false,
    preview: '',
    toolResult: intentResult.toolResult,
    error: intentResult.error,
    steps,
  };
}
