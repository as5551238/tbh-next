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
  fetchKnowledgeDocs, createKnowledgeDoc,
  fetchRisks, createRisk,
  type TaskRow, type GoalRow, type ActionItemRow, type NotificationRow, type RiskRow, type KnowledgeDocRow,
} from '@/lib/dataLayer';
import { computeAutoProgress, computePerformanceScore } from '@/lib/reviewEngine';

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
    description: '创建新任务。可关联到某个目标，支持8字段完整模型。',
    parameters: {
      title: { type: 'string', description: '任务标题', required: true },
      priority: { type: 'string', description: '优先级', enum: ['urgent', 'high', 'medium', 'low'], required: false },
      goal_id: { type: 'string', description: '关联的目标ID', required: false },
      due_date: { type: 'string', description: '截止日期 (YYYY-MM-DD)', required: false },
      description: { type: 'string', description: '任务描述', required: false },
      milestone: { type: 'string', description: '所属里程碑', required: false },
      tags: { type: 'string', description: '标签（逗号分隔）', required: false },
      assignee_id: { type: 'string', description: '负责人ID', required: false },
    },
    handler: async (params) => {
      const tagsStr = String(params.tags ?? '');
      const tags = tagsStr ? tagsStr.split(/[,，]/).map((s: string) => s.trim()).filter(Boolean) : [];
      return await createTask({
        title: String(params.title),
        priority: String(params.priority ?? 'medium'),
        status: 'todo',
        done: false,
        goal_id: (params.goal_id as string) ?? null,
        due_date: (params.due_date as string) ?? null,
        assignee_id: (params.assignee_id as string) ?? null,
        leader_id: null,
        description: (params.description as string) ?? null,
        milestone: (params.milestone as string) ?? null,
        tags,
      } as Omit<TaskRow, 'id'>);
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
  {
    name: 'search_knowledge',
    description: '搜索知识库文档。可按关键词搜索标题、内容或标签。用于回答基于团队知识的问题。',
    parameters: {
      query: { type: 'string', description: '搜索关键词', required: true },
    },
    handler: async (params) => {
      const docs = await fetchKnowledgeDocs();
      const q = String(params.query).toLowerCase();
      const results = docs.filter((d) => {
        const title = String(d.title ?? '').toLowerCase();
        const content = String(d.content ?? '').toLowerCase();
        const tags = Array.isArray(d.tags) ? d.tags.map((t: unknown) => String(t).toLowerCase()) : [];
        return title.includes(q) || content.includes(q) || tags.some((t: string) => t.includes(q));
      });
      return results.slice(0, 10).map((d) => ({
        id: d.id, title: d.title, tags: d.tags,
        snippet: String(d.content ?? '').slice(0, 200),
      }));
    },
  },
  {
    name: 'create_knowledge_doc',
    description: '创建知识文档。用于将讨论结论、经验教训、最佳实践沉淀为知识资产。',
    parameters: {
      title: { type: 'string', description: '文档标题', required: true },
      content: { type: 'string', description: '文档内容', required: true },
      tags: { type: 'string', description: '标签（逗号分隔）', required: false },
    },
    handler: async (params) => {
      const tagsStr = String(params.tags ?? '');
      const tags = tagsStr ? tagsStr.split(/[,，]/).map((s: string) => s.trim()).filter(Boolean) : [];
      return await createKnowledgeDoc({
        title: String(params.title),
        content: String(params.content),
        tags,
        member_id: null,
        related_items: [],
        color: '#7b6cf0',
      } as Omit<KnowledgeDocRow, 'id' | 'created_at' | 'updated_at'>);
    },
  },
  {
    name: 'search_risks',
    description: '搜索风险登记册。可按严重程度、状态或关键词筛选。用于了解团队当前风险状况。',
    parameters: {
      severity: { type: 'string', description: '按严重程度筛选', enum: ['low', 'medium', 'high', 'critical'], required: false },
      status: { type: 'string', description: '按状态筛选', enum: ['identified', 'analyzing', 'mitigating', 'resolved', 'accepted'], required: false },
      keyword: { type: 'string', description: '按标题或描述关键词筛选', required: false },
    },
    handler: async (params) => {
      const risks = await fetchRisks();
      let filtered = risks as RiskRow[];
      if (params.severity) filtered = filtered.filter((r: RiskRow) => r.severity === params.severity);
      if (params.status) filtered = filtered.filter((r: RiskRow) => r.status === params.status);
      if (params.keyword) {
        const kw = String(params.keyword).toLowerCase();
        filtered = filtered.filter((r: RiskRow) =>
          String(r.title ?? '').toLowerCase().includes(kw) ||
          String(r.description ?? '').toLowerCase().includes(kw)
        );
      }
      return filtered.slice(0, 20).map((r: RiskRow) => ({
        id: r.id, title: r.title, severity: r.severity, status: r.status,
        impact: r.impact, likelihood: r.likelihood, owner_id: r.owner_id,
        due_date: r.due_date,
      }));
    },
  },
  {
    name: 'get_team_metrics',
    description: '获取团队核心指标：目标达成率、任务完成率、风险分布、行动项关闭率。用于快速了解团队整体表现。',
    parameters: {},
    handler: async () => {
      const [goals, tasks, risks, actionItems] = await Promise.all([
        fetchGoals(), fetchTasks(), fetchRisks(), fetchActionItems(),
      ]);
      const activeGoals = (goals as GoalRow[]).filter((g: GoalRow) => g.status !== 'cancelled');
      const goalCompletionRate = activeGoals.length > 0
        ? Math.round(activeGoals.filter((g: GoalRow) => g.status === 'completed').length / activeGoals.length * 100)
        : 0;
      const allTasks = tasks as TaskRow[];
      const taskCompletionRate = allTasks.length > 0
        ? Math.round(allTasks.filter((t: TaskRow) => t.done || t.status === 'done').length / allTasks.length * 100)
        : 0;
      const allRisks = risks as RiskRow[];
      const risksBySeverity: Record<string, number> = {};
      for (const r of allRisks) {
        const sev = r.severity ?? 'unknown';
        risksBySeverity[sev] = (risksBySeverity[sev] ?? 0) + 1;
      }
      const allActionItems = actionItems as ActionItemRow[];
      const actionItemCloseRate = allActionItems.length > 0
        ? Math.round(allActionItems.filter((a: ActionItemRow) => a.status === 'completed' || a.closed_loop).length / allActionItems.length * 100)
        : 100;
      return {
        goalCount: activeGoals.length,
        goalCompletionRate,
        taskCount: allTasks.length,
        taskCompletionRate,
        riskCount: allRisks.length,
        risksBySeverity,
        actionItemCount: allActionItems.length,
        actionItemCloseRate,
        overdueTasks: allTasks.filter((t: TaskRow) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done' && !t.done).length,
        atRiskGoals: activeGoals.filter((g: GoalRow) => g.progress < 50 && g.end_date && new Date(g.end_date) < new Date(Date.now() + 14 * 86400000)).length,
      };
    },
  },
  {
    name: 'create_review',
    description: '发起复盘周期。用于定期回顾目标进展、分析偏差、制定改进措施。',
    parameters: {
      title: { type: 'string', description: '复盘标题', required: true },
      review_type: { type: 'string', description: '复盘模型', enum: ['GRAI', 'PDCA', '5Whys'], required: false },
      goal_id: { type: 'string', description: '关联的目标ID', required: false },
    },
    handler: async (params) => {
      const reviewType = String(params.review_type ?? 'GRAI');
      const goalId = (params.goal_id as string) ?? null;
      const title = String(params.title);
      // Create an action item as the review artifact since reviews table has no dedicated create yet
      return await createActionItem({
        title: `[${reviewType}] ${title}`,
        description: `复盘周期已发起，模型：${reviewType}${goalId ? `，关联目标：${goalId}` : ''}`,
        source: 'ai_review',
        source_id: goalId,
        goal_id: goalId,
        status: 'open',
        priority: 'high',
        assignee_id: null,
        due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        closed_loop: false,
      });
    },
  },
  {
    name: 'create_goal',
    description: '创建新目标。用于设定团队OKR、季度目标等。',
    parameters: {
      title: { type: 'string', description: '目标标题', required: true },
      end_date: { type: 'string', description: '截止日期 (YYYY-MM-DD)', required: false },
      description: { type: 'string', description: '目标描述', required: false },
    },
    handler: async (params) => {
      return await createGoal({
        title: String(params.title),
        progress: 0,
        status: 'in_progress',
        key_results: [],
        owner_id: null,
        leader_id: null,
        end_date: (params.end_date as string) ?? null,
        start_date: null,
        description: (params.description as string) ?? null,
      });
    },
  },
  {
    name: 'get_deviation_alerts',
    description: '获取偏差预警和风险列表。用于查看逾期任务、目标偏离、异常指标等。综合搜索风险和逾期任务。',
    parameters: {
      severity: { type: 'string', description: '按严重程度筛选', enum: ['low', 'medium', 'high', 'critical'], required: false },
    },
    handler: async (params) => {
      const [risks, tasks] = await Promise.all([fetchRisks(), fetchTasks()]);
      // Get overdue tasks
      const now = new Date();
      const overdueTasks = (tasks as TaskRow[]).filter((t: TaskRow) =>
        t.due_date && new Date(t.due_date) < now && t.status !== 'done' && !t.done
      );
      // Get open risks
      let filteredRisks = (risks as RiskRow[]).filter((r: RiskRow) => r.status !== 'resolved' && r.status !== 'accepted');
      if (params.severity) filteredRisks = filteredRisks.filter((r: RiskRow) => r.severity === params.severity);
      return {
        overdueTasks: overdueTasks.map((t: TaskRow) => ({
          id: t.id, title: t.title, due_date: t.due_date, priority: t.priority,
        })),
        openRisks: filteredRisks.map((r: RiskRow) => ({
          id: r.id, title: r.title, severity: r.severity, status: r.status,
        })),
        totalAlerts: overdueTasks.length + filteredRisks.length,
      };
    },
  },
  {
    name: 'get_schedule_events',
    description: '获取日程安排。用于查看今天/即将到来的会议、事件等。',
    parameters: {
      days_ahead: { type: 'number', description: '查看未来几天 (默认7天)', required: false },
    },
    handler: async (params) => {
      // Schedule events may not exist in dataLayer; return tasks with due dates as substitute
      const tasks = await fetchTasks();
      const daysAhead = Number(params.days_ahead ?? 7);
      const cutoff = new Date(Date.now() + daysAhead * 86400000);
      const now = new Date();
      const upcoming = (tasks as TaskRow[]).filter((t: TaskRow) => {
        if (!t.due_date) return false;
        const d = new Date(t.due_date);
        return d >= now && d <= cutoff && t.status !== 'done' && !t.done;
      });
      return upcoming.map((t: TaskRow) => ({
        id: t.id, title: t.title, due_date: t.due_date, priority: t.priority,
        status: t.status, goal_id: t.goal_id,
      }));
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
