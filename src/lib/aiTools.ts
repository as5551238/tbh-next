/**
 * AI Tool Use Engine — Real tools the AI can call during chat.
 *
 * These tools give the AI the ability to perform real actions:
 * - CRUD on goals, tasks, action items
 * - Send notifications
 * - Query current data
 *
 * The tool definitions follow the OpenAI function-calling schema.
 * Tool execution is handled client-side with Supabase writes.
 */

import {
  createTask, updateTask, fetchTasks,
  createGoal, updateGoal, fetchGoals,
  createActionItem, updateActionItem, fetchActionItems,
  createNotification,
  type TaskRow, type GoalRow, type ActionItemRow, type NotificationRow,
} from '@/lib/dataLayer';
import { computeAutoProgress } from '@/lib/reviewEngine';

// --- Tool Schema Definition (OpenAI-compatible) ---

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean; enum?: string[] }>;
  handler: (params: Record<string, unknown>) => Promise<unknown>;
}

// --- Tool Implementations ---

const toolDefs: ToolDefinition[] = [
  {
    name: 'get_goals',
    description: '获取当前所有目标及其进度、状态。用于了解团队目标全貌。',
    parameters: {},
    handler: async () => {
      const goals = await fetchGoals();
      return goals.map((g: GoalRow) => ({
        id: g.id, title: g.title, progress: g.progress, status: g.status,
        end_date: g.end_date, key_results_count: g.key_results?.length ?? 0,
      }));
    },
  },
  {
    name: 'get_tasks',
    description: '获取当前任务列表。可按目标ID筛选。用于了解任务进展。',
    parameters: {
      goal_id: { type: 'string', description: '按目标ID筛选任务（可选）', required: false },
    },
    handler: async (params) => {
      const tasks = await fetchTasks();
      const filtered = params.goal_id
        ? tasks.filter((t: TaskRow) => t.goal_id === params.goal_id)
        : tasks;
      return filtered.map((t: TaskRow) => ({
        id: t.id, title: t.title, status: t.status, priority: t.priority,
        goal_id: t.goal_id, due_date: t.due_date, done: t.done,
      }));
    },
  },
  {
    name: 'create_task',
    description: '创建新任务。可关联到某个目标。',
    parameters: {
      title: { type: 'string', description: '任务标题', required: true },
      priority: { type: 'string', description: '优先级', enum: ['urgent', 'high', 'medium', 'low'], required: false },
      goal_id: { type: 'string', description: '关联的目标ID', required: false },
      due_date: { type: 'string', description: '截止日期 (YYYY-MM-DD)', required: false },
    },
    handler: async (params) => {
      return await createTask({
        title: String(params.title),
        priority: String(params.priority ?? 'medium'),
        status: 'todo',
        goal_id: (params.goal_id as string) ?? null,
        due_date: (params.due_date as string) ?? null,
        assignee_id: null,
        leader_id: null,
      });
    },
  },
  {
    name: 'update_task_status',
    description: '更新任务状态。用于标记任务完成、进行中等。',
    parameters: {
      task_id: { type: 'string', description: '任务ID', required: true },
      status: { type: 'string', description: '新状态', enum: ['todo', 'in_progress', 'done', 'blocked', 'cancelled'], required: true },
    },
    handler: async (params) => {
      const taskId = String(params.task_id);
      const newStatus = String(params.status);
      const result = await updateTask(taskId, { status: newStatus });

      // Auto-recalculate goal progress if task is linked to a goal
      const tasks = await fetchTasks();
      const task = tasks.find((t: TaskRow) => t.id === taskId);
      if (task?.goal_id) {
        const autoProg = computeAutoProgress(task.goal_id, tasks);
        if (autoProg >= 0) {
          await updateGoal(task.goal_id, { progress: autoProg });
        }
      }
      return result;
    },
  },
  {
    name: 'create_action_item',
    description: '创建行动项。用于将讨论结果或发现转化为具体行动。',
    parameters: {
      title: { type: 'string', description: '行动项标题', required: true },
      description: { type: 'string', description: '详细描述', required: false },
      goal_id: { type: 'string', description: '关联的目标ID', required: false },
      priority: { type: 'string', description: '优先级', enum: ['low', 'medium', 'high', 'critical'], required: false },
    },
    handler: async (params) => {
      return await createActionItem({
        title: String(params.title),
        description: String(params.description ?? ''),
        source: 'ai_suggested',
        source_id: null,
        goal_id: (params.goal_id as string) ?? null,
        status: 'open',
        priority: String(params.priority ?? 'medium') as ActionItemRow['priority'],
        assignee_id: null,
        due_date: null,
        closed_loop: false,
      });
    },
  },
  {
    name: 'get_action_items',
    description: '获取行动项列表。可按状态筛选。',
    parameters: {
      status: { type: 'string', description: '按状态筛选', enum: ['open', 'in_progress', 'completed', 'cancelled'], required: false },
    },
    handler: async (params) => {
      const items = await fetchActionItems();
      const filtered = params.status
        ? items.filter((a: ActionItemRow) => a.status === params.status)
        : items.filter((a: ActionItemRow) => a.status === 'open' || a.status === 'in_progress');
      return filtered.map((a: ActionItemRow) => ({
        id: a.id, title: a.title, status: a.status, priority: a.priority,
        goal_id: a.goal_id, source: a.source, due_date: a.due_date,
      }));
    },
  },
  {
    name: 'send_notification',
    description: '发送通知给团队成员。用于重要事项提醒、变更告知。',
    parameters: {
      title: { type: 'string', description: '通知标题', required: true },
      message: { type: 'string', description: '通知内容', required: true },
      type: { type: 'string', description: '通知类型', enum: ['alert', 'mention', 'update', 'system'], required: false },
      related_id: { type: 'string', description: '关联实体ID（如目标ID）', required: false },
      related_type: { type: 'string', description: '关联实体类型（如goal, task）', required: false },
    },
    handler: async (params) => {
      await createNotification({
        title: String(params.title),
        message: String(params.message),
        type: String(params.type ?? 'system') as NotificationRow['type'],
        related_id: (params.related_id as string) ?? null,
        related_type: (params.related_type as string) ?? null,
        member_id: null,
        level: params.type === 'alert' ? 'warn' : 'info',
      });
      return { success: true, title: params.title };
    },
  },
  {
    name: 'update_goal_progress',
    description: '更新目标进度。通常由系统自动完成，但也可手动调整。',
    parameters: {
      goal_id: { type: 'string', description: '目标ID', required: true },
      progress: { type: 'number', description: '新进度值 (0-100)', required: true },
    },
    handler: async (params) => {
      const goalId = String(params.goal_id);
      const progress = Math.min(100, Math.max(0, Number(params.progress)));
      return await updateGoal(goalId, { progress });
    },
  },
];

// --- Public API ---

/** Get all tool definitions in OpenAI function-calling format */
export function getToolSchemas(): Array<{
  type: 'function';
  function: { name: string; description: string; parameters: { type: 'object'; properties: Record<string, unknown>; required: string[] } };
}> {
  return toolDefs.map((t) => {
    const required = Object.entries(t.parameters)
      .filter(([, v]) => v.required)
      .map(([k]) => k);
    const properties: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(t.parameters)) {
      const { required: _, ...rest } = v;
      properties[k] = rest;
    }
    return {
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: { type: 'object', properties, required },
      },
    };
  });
}

/** Execute a tool call by name */
export async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const tool = toolDefs.find((t) => t.name === toolName);
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }
  return tool.handler(args);
}

/** Check if a tool name is valid */
export function isValidTool(name: string): boolean {
  return toolDefs.some((t) => t.name === name);
}
