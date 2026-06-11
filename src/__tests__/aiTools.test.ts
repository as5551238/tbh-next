import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockFetchGoals, mockFetchTasks, mockFetchRisks, mockFetchActionItems,
  mockFetchKnowledgeDocs, mockCreateGoal, mockCreateTask, mockUpdateGoal,
  mockUpdateTask, mockCreateActionItem, mockCreateNotification,
  mockCreateKnowledgeDoc, mockCreateRisk,
} = vi.hoisted(() => ({
  mockFetchGoals: vi.fn(),
  mockFetchTasks: vi.fn(),
  mockFetchRisks: vi.fn(),
  mockFetchActionItems: vi.fn(),
  mockFetchKnowledgeDocs: vi.fn(),
  mockCreateGoal: vi.fn(),
  mockCreateTask: vi.fn(),
  mockUpdateGoal: vi.fn(),
  mockUpdateTask: vi.fn(),
  mockCreateActionItem: vi.fn(),
  mockCreateNotification: vi.fn(),
  mockCreateKnowledgeDoc: vi.fn(),
  mockCreateRisk: vi.fn(),
}));

vi.mock('@/lib/dataLayer', () => ({
  fetchGoals: mockFetchGoals,
  fetchTasks: mockFetchTasks,
  fetchRisks: mockFetchRisks,
  fetchActionItems: mockFetchActionItems,
  fetchKnowledgeDocs: mockFetchKnowledgeDocs,
  createGoal: mockCreateGoal,
  createTask: mockCreateTask,
  updateGoal: mockUpdateGoal,
  updateTask: mockUpdateTask,
  createActionItem: mockCreateActionItem,
  createNotification: mockCreateNotification,
  createKnowledgeDoc: mockCreateKnowledgeDoc,
  createRisk: mockCreateRisk,
}));

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: () => false,
  supabase: null,
}));

vi.mock('@/lib/reviewEngine', () => ({
  computeAutoProgress: vi.fn().mockReturnValue(50),
  computePerformanceScore: vi.fn().mockReturnValue(0),
}));

import { executeToolCall, getToolSchemas, isValidTool } from '@/lib/aiTools';

const TOOL_NAMES = [
  'get_goals', 'get_tasks', 'create_task', 'update_task_status',
  'create_action_item', 'get_action_items', 'send_notification',
  'update_goal_progress', 'search_knowledge', 'create_knowledge_doc',
  'search_risks', 'get_team_metrics', 'create_review', 'create_goal',
  'get_deviation_alerts', 'get_schedule_events',
];

describe('AI Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Tool definitions', () => {
    it('has 16 tools with proper structure', () => {
      const schemas = getToolSchemas();
      expect(schemas).toHaveLength(16);
      for (const schema of schemas) {
        expect(schema.type).toBe('function');
        expect(schema.function.name).toBeTruthy();
        expect(typeof schema.function.description).toBe('string');
        expect(schema.function.parameters.type).toBe('object');
        expect(schema.function.parameters.properties).toBeDefined();
        expect(Array.isArray(schema.function.parameters.required)).toBe(true);
      }
    });

    it('each tool name is valid via isValidTool', () => {
      for (const name of TOOL_NAMES) {
        expect(isValidTool(name)).toBe(true);
      }
    });

    it('unknown tool name is invalid', () => {
      expect(isValidTool('nonexistent_tool')).toBe(false);
    });
  });

  describe('executeToolCall error handling', () => {
    it('throws for unknown tool name', async () => {
      await expect(executeToolCall('unknown_tool', {})).rejects.toThrow(
        'Unknown tool: unknown_tool'
      );
    });
  });

  describe('Parameter validation (schema)', () => {
    it('create_task marks title as required', () => {
      const schema = getToolSchemas().find(s => s.function.name === 'create_task')!;
      expect(schema.function.parameters.required).toContain('title');
    });

    it('create_goal marks title as required', () => {
      const schema = getToolSchemas().find(s => s.function.name === 'create_goal')!;
      expect(schema.function.parameters.required).toContain('title');
    });

    it('update_task_status marks task_id and status as required', () => {
      const schema = getToolSchemas().find(s => s.function.name === 'update_task_status')!;
      expect(schema.function.parameters.required).toContain('task_id');
      expect(schema.function.parameters.required).toContain('status');
    });

    it('send_notification marks title and message as required', () => {
      const schema = getToolSchemas().find(s => s.function.name === 'send_notification')!;
      expect(schema.function.parameters.required).toContain('title');
      expect(schema.function.parameters.required).toContain('message');
    });
  });

  describe('create_task handler', () => {
    it('calls createTask with correct defaults', async () => {
      mockCreateTask.mockResolvedValue({ id: 't1', title: 'My Task' });
      const result = await executeToolCall('create_task', { title: 'My Task' });
      expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining({
        title: 'My Task',
        priority: 'medium',
        status: 'todo',
        done: false,
        goal_id: null,
        due_date: null,
        assignee_id: null,
        leader_id: null,
        description: null,
        milestone: null,
        tags: [],
      }));
      expect(result).toEqual({ id: 't1', title: 'My Task' });
    });

    it('passes all optional fields', async () => {
      mockCreateTask.mockResolvedValue({ id: 't2' });
      await executeToolCall('create_task', {
        title: 'Full Task',
        priority: 'urgent',
        goal_id: 'g1',
        due_date: '2026-12-31',
        description: 'desc',
        milestone: 'M1',
        tags: 'a, b, c',
        assignee_id: 'u1',
      });
      expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining({
        priority: 'urgent',
        goal_id: 'g1',
        due_date: '2026-12-31',
        description: 'desc',
        milestone: 'M1',
        tags: ['a', 'b', 'c'],
        assignee_id: 'u1',
      }));
    });

    it('parses Chinese-comma-separated tags', async () => {
      mockCreateTask.mockResolvedValue({ id: 't3' });
      await executeToolCall('create_task', { title: 'T', tags: 'x，y，z' });
      expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining({
        tags: ['x', 'y', 'z'],
      }));
    });
  });

  describe('create_goal handler', () => {
    it('creates a goal with title and defaults', async () => {
      mockCreateGoal.mockResolvedValue({ id: 'g1', title: 'New Goal' });
      const result = await executeToolCall('create_goal', { title: 'New Goal' });
      expect(mockCreateGoal).toHaveBeenCalledWith(expect.objectContaining({
        title: 'New Goal',
        progress: 0,
        status: 'on_track',
        key_results: [],
        owner_id: null,
        leader_id: null,
        end_date: null,
        start_date: null,
        description: null,
      }));
      expect(result).toEqual({ id: 'g1', title: 'New Goal' });
    });

    it('passes optional end_date and description', async () => {
      mockCreateGoal.mockResolvedValue({ id: 'g2' });
      await executeToolCall('create_goal', {
        title: 'Detailed Goal',
        end_date: '2026-12-31',
        description: 'A goal with details',
      });
      expect(mockCreateGoal).toHaveBeenCalledWith(expect.objectContaining({
        end_date: '2026-12-31',
        description: 'A goal with details',
      }));
    });
  });

  describe('get_team_metrics handler', () => {
    it('computes metrics from fetched data', async () => {
      mockFetchGoals.mockResolvedValue([
        { id: 'g1', title: 'Active', progress: 80, status: 'on_track', end_date: '2026-12-31', key_results: [] },
        { id: 'g2', title: 'Completed', progress: 100, status: 'completed', end_date: '2026-06-30', key_results: [] },
        { id: 'g3', title: 'Cancelled', progress: 0, status: 'cancelled', end_date: '2026-09-30', key_results: [] },
      ]);
      mockFetchTasks.mockResolvedValue([
        { id: 't1', title: 'Done', status: 'done', done: true, priority: 'medium', goal_id: 'g1', due_date: '2026-06-01' },
        { id: 't2', title: 'Todo', status: 'todo', done: false, priority: 'high', goal_id: 'g1', due_date: '2025-01-01' },
        { id: 't3', title: 'InProgress', status: 'in_progress', done: false, priority: 'low', goal_id: 'g2', due_date: '2026-08-01' },
      ]);
      mockFetchRisks.mockResolvedValue([
        { id: 'r1', title: 'Risk', severity: 'high', status: 'identified', impact: null, likelihood: null, owner_id: null, due_date: null },
      ]);
      mockFetchActionItems.mockResolvedValue([
        { id: 'a1', title: 'Closed', status: 'completed', priority: 'medium', goal_id: null, source: 'ai', due_date: null, closed_loop: true },
        { id: 'a2', title: 'Open', status: 'open', priority: 'high', goal_id: null, source: 'manual', due_date: null, closed_loop: false },
      ]);

      const result = (await executeToolCall('get_team_metrics', {})) as Record<string, unknown>;

      expect(result.goalCount).toBe(2);
      expect(result.goalCompletionRate).toBe(50);
      expect(result.taskCount).toBe(3);
      expect(result.taskCompletionRate).toBe(33);
      expect(result.riskCount).toBe(1);
      expect(result.risksBySeverity).toEqual({ high: 1 });
      expect(result.actionItemCount).toBe(2);
      expect(result.actionItemCloseRate).toBe(50);
    });

    it('returns safe defaults for empty data', async () => {
      mockFetchGoals.mockResolvedValue([]);
      mockFetchTasks.mockResolvedValue([]);
      mockFetchRisks.mockResolvedValue([]);
      mockFetchActionItems.mockResolvedValue([]);

      const result = (await executeToolCall('get_team_metrics', {})) as Record<string, unknown>;

      expect(result.goalCount).toBe(0);
      expect(result.goalCompletionRate).toBe(0);
      expect(result.taskCount).toBe(0);
      expect(result.taskCompletionRate).toBe(0);
      expect(result.riskCount).toBe(0);
      expect(result.actionItemCloseRate).toBe(100);
    });
  });

  describe('get_deviation_alerts handler', () => {
    it('returns overdue tasks and open (non-resolved/accepted) risks', async () => {
      mockFetchRisks.mockResolvedValue([
        { id: 'r1', title: 'Open Risk', severity: 'high', status: 'identified' },
        { id: 'r2', title: 'Resolved Risk', severity: 'low', status: 'resolved' },
        { id: 'r3', title: 'Accepted Risk', severity: 'medium', status: 'accepted' },
      ]);
      mockFetchTasks.mockResolvedValue([
        { id: 't1', title: 'Overdue', status: 'todo', done: false, due_date: '2025-01-01', priority: 'high' },
        { id: 't2', title: 'Future', status: 'todo', done: false, due_date: '2030-12-31', priority: 'medium' },
        { id: 't3', title: 'Done Past', status: 'done', done: true, due_date: '2025-01-01', priority: 'low' },
      ]);

      const result = (await executeToolCall('get_deviation_alerts', {})) as Record<string, unknown>;

      expect((result.overdueTasks as unknown[])).toHaveLength(1);
      expect((result.overdueTasks as Record<string, unknown>[])[0].title).toBe('Overdue');
      expect((result.openRisks as unknown[])).toHaveLength(1);
      expect((result.openRisks as Record<string, unknown>[])[0].title).toBe('Open Risk');
      expect(result.totalAlerts).toBe(2);
    });

    it('filters risks by severity when provided', async () => {
      mockFetchRisks.mockResolvedValue([
        { id: 'r1', title: 'High', severity: 'high', status: 'identified' },
        { id: 'r2', title: 'Low', severity: 'low', status: 'identified' },
      ]);
      mockFetchTasks.mockResolvedValue([]);

      const result = (await executeToolCall('get_deviation_alerts', { severity: 'high' })) as Record<string, unknown>;

      expect((result.openRisks as unknown[])).toHaveLength(1);
      expect((result.openRisks as Record<string, unknown>[])[0].severity).toBe('high');
    });
  });

  describe('get_schedule_events handler', () => {
    it('returns upcoming non-done tasks within 7-day window', async () => {
      const futureDate = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
      mockFetchTasks.mockResolvedValue([
        { id: 't1', title: 'Upcoming', status: 'todo', done: false, due_date: futureDate, priority: 'high', goal_id: 'g1' },
        { id: 't2', title: 'Past', status: 'todo', done: false, due_date: '2025-01-01', priority: 'low', goal_id: null },
        { id: 't3', title: 'No Date', status: 'todo', done: false, due_date: null, priority: 'medium', goal_id: null },
        { id: 't4', title: 'Done', status: 'done', done: true, due_date: futureDate, priority: 'low', goal_id: null },
      ]);

      const result = (await executeToolCall('get_schedule_events', {})) as Record<string, unknown>[];

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Upcoming');
    });

    it('respects days_ahead parameter', async () => {
      const nearFuture = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
      const farFuture = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
      mockFetchTasks.mockResolvedValue([
        { id: 't1', title: 'Near', status: 'todo', done: false, due_date: nearFuture, priority: 'medium', goal_id: null },
        { id: 't2', title: 'Far', status: 'todo', done: false, due_date: farFuture, priority: 'high', goal_id: null },
      ]);

      const result = (await executeToolCall('get_schedule_events', { days_ahead: 7 })) as Record<string, unknown>[];

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Near');
    });
  });
});
