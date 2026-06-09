import { describe, it, expect } from 'vitest';
import {
  computeAutoProgress,
  computePerformanceScore,
  recommendModels,
  detectDeviations,
  REVIEW_MODELS,
  type ReviewContext,
} from '@/lib/reviewEngine';

describe('computeAutoProgress', () => {
  const tasks = [
    { goal_id: 'g1', status: 'done', done: true },
    { goal_id: 'g1', status: 'todo', done: false },
    { goal_id: 'g1', status: 'in_progress', done: false },
    { goal_id: 'g2', status: 'done', done: true },
    { goal_id: 'g2', status: 'done', done: true },
    { goal_id: 'other', status: 'done', done: true },
  ];

  it('computes progress from task completion rate', () => {
    expect(computeAutoProgress('g1', tasks)).toBe(33);
  });

  it('returns 100 when all tasks are done', () => {
    expect(computeAutoProgress('g2', tasks)).toBe(100);
  });

  it('returns -1 when no tasks are linked', () => {
    expect(computeAutoProgress('no_tasks', tasks)).toBe(-1);
  });

  it('returns 0 when no tasks are completed', () => {
    const allTodo = [
      { goal_id: 'g3', status: 'todo', done: false },
      { goal_id: 'g3', status: 'in_progress', done: false },
    ];
    expect(computeAutoProgress('g3', allTodo)).toBe(0);
  });

  it('counts completed status as done even if done flag is false', () => {
    const tasks2 = [
      { goal_id: 'g4', status: 'completed', done: false },
      { goal_id: 'g4', status: 'todo', done: false },
    ];
    expect(computeAutoProgress('g4', tasks2)).toBe(50);
  });

  it('handles empty tasks array', () => {
    expect(computeAutoProgress('g1', [])).toBe(-1);
  });
});

describe('computePerformanceScore', () => {
  it('computes perfect score as grade S', () => {
    const result = computePerformanceScore({
      goalId: 'g1',
      goalTitle: 'Test Goal',
      targetProgress: 100,
      actualProgress: 100,
      totalTasks: 10,
      completedTasks: 10,
      onTimeTasks: 10,
      totalActionItems: 5,
      closedActionItems: 5,
    });
    expect(result.achievementRate).toBe(100);
    expect(result.taskCompletionRate).toBe(100);
    expect(result.onTimeRate).toBe(100);
    expect(result.actionItemCloseRate).toBe(100);
    expect(result.overall).toBe(100);
    expect(result.grade).toBe('S');
  });

  it('assigns grade S for overall >= 95', () => {
    const result = computePerformanceScore({
      goalId: 'g1', goalTitle: 'G',
      targetProgress: 100, actualProgress: 95,
      totalTasks: 20, completedTasks: 19,
      onTimeTasks: 19, totalActionItems: 10, closedActionItems: 10,
    });
    expect(result.grade).toBe('S');
  });

  it('assigns grade A for overall >= 85', () => {
    const result = computePerformanceScore({
      goalId: 'g1', goalTitle: 'G',
      targetProgress: 100, actualProgress: 90,
      totalTasks: 10, completedTasks: 9,
      onTimeTasks: 9, totalActionItems: 5, closedActionItems: 5,
    });
    expect(result.overall).toBeGreaterThanOrEqual(85);
    expect(result.grade).toBe('A');
  });

  it('assigns grade B for overall >= 70', () => {
    const result = computePerformanceScore({
      goalId: 'g1', goalTitle: 'G',
      targetProgress: 100, actualProgress: 70,
      totalTasks: 10, completedTasks: 7,
      onTimeTasks: 6, totalActionItems: 4, closedActionItems: 3,
    });
    expect(result.grade).toBe('B');
  });

  it('assigns grade C for overall >= 50', () => {
    const result = computePerformanceScore({
      goalId: 'g1', goalTitle: 'G',
      targetProgress: 100, actualProgress: 50,
      totalTasks: 10, completedTasks: 5,
      onTimeTasks: 4, totalActionItems: 3, closedActionItems: 1,
    });
    expect(result.grade).toBe('C');
  });

  it('assigns grade D for overall < 50', () => {
    const result = computePerformanceScore({
      goalId: 'g1', goalTitle: 'G',
      targetProgress: 100, actualProgress: 20,
      totalTasks: 10, completedTasks: 2,
      onTimeTasks: 1, totalActionItems: 2, closedActionItems: 0,
    });
    expect(result.grade).toBe('D');
  });

  it('caps achievementRate at 100', () => {
    const result = computePerformanceScore({
      goalId: 'g1', goalTitle: 'G',
      targetProgress: 50, actualProgress: 80,
      totalTasks: 10, completedTasks: 10,
      onTimeTasks: 10, totalActionItems: 5, closedActionItems: 5,
    });
    expect(result.achievementRate).toBe(100);
  });

  it('returns taskCompletionRate 0 when totalTasks is 0', () => {
    const result = computePerformanceScore({
      goalId: 'g1', goalTitle: 'G',
      targetProgress: 100, actualProgress: 100,
      totalTasks: 0, completedTasks: 0,
      onTimeTasks: 0, totalActionItems: 0, closedActionItems: 0,
    });
    expect(result.taskCompletionRate).toBe(0);
  });

  it('returns onTimeRate 100 when completedTasks is 0', () => {
    const result = computePerformanceScore({
      goalId: 'g1', goalTitle: 'G',
      targetProgress: 100, actualProgress: 0,
      totalTasks: 10, completedTasks: 0,
      onTimeTasks: 0, totalActionItems: 5, closedActionItems: 2,
    });
    expect(result.onTimeRate).toBe(100);
  });

  it('returns actionItemCloseRate 100 when totalActionItems is 0', () => {
    const result = computePerformanceScore({
      goalId: 'g1', goalTitle: 'G',
      targetProgress: 100, actualProgress: 100,
      totalTasks: 5, completedTasks: 5,
      onTimeTasks: 5, totalActionItems: 0, closedActionItems: 0,
    });
    expect(result.actionItemCloseRate).toBe(100);
  });

  it('handles zero target progress gracefully', () => {
    const result = computePerformanceScore({
      goalId: 'g1', goalTitle: 'G',
      targetProgress: 0, actualProgress: 50,
      totalTasks: 10, completedTasks: 5,
      onTimeTasks: 4, totalActionItems: 2, closedActionItems: 1,
    });
    expect(result.achievementRate).toBe(50);
  });

  it('uses correct formula weights for overall', () => {
    const result = computePerformanceScore({
      goalId: 'g1', goalTitle: 'G',
      targetProgress: 100, actualProgress: 60,
      totalTasks: 10, completedTasks: 8,
      onTimeTasks: 6, totalActionItems: 4, closedActionItems: 2,
    });
    const expected = Math.round(
      result.achievementRate * 0.4 +
      result.taskCompletionRate * 0.25 +
      result.onTimeRate * 0.2 +
      result.actionItemCloseRate * 0.15
    );
    expect(result.overall).toBe(expected);
  });
});

describe('recommendModels', () => {
  const baseCtx: ReviewContext = {
    targetTitle: 'Test',
    targetType: 'goal',
    progress: 50,
    status: 'in_progress',
    deviationPercent: 0,
    tags: [],
    daysRemaining: 30,
    isOverdue: false,
  };

  it('defaults to GRAI when no specific match', () => {
    const results = recommendModels(baseCtx);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].model.id).toBe('grai');
  });

  it('recommends 5whys for severe deviation', () => {
    const results = recommendModels({
      ...baseCtx,
      deviationPercent: -40,
      isOverdue: true,
    });
    const top = results.find((r) => r.model.id === '5whys');
    expect(top).toBeDefined();
    expect(top!.score).toBeGreaterThan(0);
  });

  it('recommends PDCA for project/task type', () => {
    const results = recommendModels({
      ...baseCtx,
      targetType: 'project',
      deviationPercent: -15,
    });
    const pdca = results.find((r) => r.model.id === 'pdca');
    expect(pdca).toBeDefined();
  });

  it('recommends GRAI for goal type', () => {
    const results = recommendModels({
      ...baseCtx,
      targetType: 'goal',
    });
    const grai = results.find((r) => r.model.id === 'grai');
    expect(grai).toBeDefined();
    expect(grai!.score).toBeGreaterThan(0);
  });

  it('returns results sorted by score descending', () => {
    const results = recommendModels({
      ...baseCtx,
      deviationPercent: -40,
      isOverdue: true,
      targetType: 'project',
    });
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it('each result has model, score, and reason', () => {
    const results = recommendModels({ ...baseCtx, deviationPercent: -20 });
    for (const r of results) {
      expect(r.model).toBeDefined();
      expect(typeof r.score).toBe('number');
      expect(typeof r.reason).toBe('string');
      expect(r.reason.length).toBeGreaterThan(0);
    }
  });
});

describe('detectDeviations', () => {
  it('detects overdue items as danger severity', () => {
    const alerts = detectDeviations([{
      id: 'g1', title: 'Overdue Goal', progress: 30,
      startDate: '2026-01-01', endDate: '2026-03-01', type: 'goal',
    }]);
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].severity).toBe('danger');
  });

  it('skips items without start or end date', () => {
    const alerts = detectDeviations([{
      id: 'g1', title: 'No dates', progress: 50,
      startDate: null, endDate: null, type: 'goal',
    }]);
    expect(alerts).toHaveLength(0);
  });

  it('skips items with no significant deviation', () => {
    const futureStart = new Date();
    futureStart.setFullYear(futureStart.getFullYear() - 1);
    const futureEnd = new Date();
    futureEnd.setFullYear(futureEnd.getFullYear() + 1);
    const alerts = detectDeviations([{
      id: 'g1', title: 'On Track', progress: 50,
      startDate: futureStart.toISOString().slice(0, 10),
      endDate: futureEnd.toISOString().slice(0, 10),
      type: 'goal',
    }]);
    expect(alerts).toHaveLength(0);
  });

  it('sorts alerts by severity (danger first)', () => {
    const alerts = detectDeviations([
      { id: 'a', title: 'Mild', progress: 40, startDate: '2026-01-01', endDate: '2026-12-31', type: 'goal' },
      { id: 'b', title: 'Overdue', progress: 10, startDate: '2025-01-01', endDate: '2025-12-31', type: 'goal' },
    ]);
    if (alerts.length >= 2) {
      const sevOrder = { danger: 0, warn: 1, info: 2 };
      expect(sevOrder[alerts[0].severity]).toBeLessThanOrEqual(sevOrder[alerts[1].severity]);
    }
  });
});

describe('REVIEW_MODELS', () => {
  it('has exactly 3 review models', () => {
    expect(REVIEW_MODELS).toHaveLength(3);
  });

  it('each model has required fields', () => {
    for (const model of REVIEW_MODELS) {
      expect(model.id).toBeDefined();
      expect(model.name).toBeTruthy();
      expect(model.steps.length).toBeGreaterThan(0);
      expect(model.outputTemplate).toBeTruthy();
    }
  });

  it('model IDs are grai, pdca, 5whys', () => {
    const ids = REVIEW_MODELS.map((m) => m.id);
    expect(ids).toContain('grai');
    expect(ids).toContain('pdca');
    expect(ids).toContain('5whys');
  });
});
