import { describe, it, expect } from 'vitest';
import {
  computePriorityScore,
  prioritizeItems,
  generateFocusPlan,
  FOCUS_TAG_CONFIG,
  type Prioritizable,
} from '@/lib/priorityEngine';

const pastDate = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
};

const futureDate = (daysAhead: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
};

const baseTask: Prioritizable = {
  id: 't1', title: 'Test task', type: 'task',
  priority: 'medium', status: 'todo', progress: 0,
};

describe('computePriorityScore', () => {
  it('gives higher urgency score to overdue items', () => {
    const overdue = computePriorityScore({ ...baseTask, due_date: pastDate(3) });
    const future = computePriorityScore({ ...baseTask, due_date: futureDate(10) });
    expect(overdue.score).toBeGreaterThan(future.score);
    expect(overdue.tag).toBe('urgent');
    expect(overdue.reason).toContain('逾期');
  });

  it('gives higher score to urgent priority than low priority', () => {
    const urgent = computePriorityScore({ ...baseTask, priority: 'urgent' });
    const low = computePriorityScore({ ...baseTask, priority: 'low' });
    expect(urgent.score).toBeGreaterThan(low.score);
  });

  it('tags overdue items as urgent', () => {
    const result = computePriorityScore({ ...baseTask, due_date: pastDate(1) });
    expect(result.tag).toBe('urgent');
  });

  it('tags high-impact items as important', () => {
    const result = computePriorityScore({
      ...baseTask, type: 'goal', priority: 'high',
    });
    expect(result.tag).toBe('important');
  });

  it('tags in-progress tasks with momentum when not urgent/important', () => {
    const result = computePriorityScore({
      ...baseTask, type: 'task', priority: 'low', status: 'in_progress',
    });
    expect(result.tag).toBe('momentum');
  });

  it('tags quick-win action_item as low-hanging', () => {
    const result = computePriorityScore({
      ...baseTask, type: 'action_item', status: 'open', priority: 'medium',
    });
    expect(result.tag).toBe('low-hanging');
  });

  it('gives low urgency when no due_date set', () => {
    const result = computePriorityScore({ ...baseTask, due_date: null });
    expect(result.score).toBeLessThan(
      computePriorityScore({ ...baseTask, due_date: pastDate(1) }).score,
    );
  });

  it('today-due item gets higher score than far-future item', () => {
    const today = computePriorityScore({ ...baseTask, due_date: futureDate(0) });
    const later = computePriorityScore({ ...baseTask, due_date: futureDate(5) });
    expect(today.score).toBeGreaterThan(later.score);
  });

  it('returns monitor tag for low-priority unlinked tasks', () => {
    const result = computePriorityScore({
      ...baseTask, type: 'task', priority: 'low', status: 'todo', goal_id: null,
    });
    expect(result.tag).toBe('monitor');
  });

  it('overdue item reason contains days overdue', () => {
    const result = computePriorityScore({ ...baseTask, due_date: pastDate(5) });
    expect(result.reason).toContain('5');
  });

  it('due-today item reason contains 今日到期', () => {
    const result = computePriorityScore({ ...baseTask, due_date: futureDate(0) });
    expect(result.reason).toContain('今日到期');
  });

  it('due within 2 days reason contains days', () => {
    const result = computePriorityScore({ ...baseTask, due_date: futureDate(2) });
    expect(result.reason).toContain('2天后到期');
  });

  it('goal type always gets high impact', () => {
    const result = computePriorityScore({ ...baseTask, type: 'goal', priority: 'medium' });
    expect(result.tag).toBe('important');
  });

  it('urgent priority goal gets impact=25', () => {
    const result = computePriorityScore({ ...baseTask, type: 'goal', priority: 'urgent' });
    expect(result.score).toBeGreaterThanOrEqual(25);
  });

  it('task with goal_id gets higher impact than without', () => {
    const withGoal = computePriorityScore({ ...baseTask, goal_id: 'g1', priority: 'medium' });
    const without = computePriorityScore({ ...baseTask, goal_id: null, priority: 'medium' });
    expect(withGoal.score).toBeGreaterThan(without.score);
  });

  it('action_item from ai_suggested gets impact bonus', () => {
    const ai = computePriorityScore({
      ...baseTask, type: 'action_item', source: 'ai_suggested', priority: 'medium',
    });
    const manual = computePriorityScore({
      ...baseTask, type: 'action_item', source: 'manual', priority: 'medium',
    });
    expect(ai.score).toBeGreaterThan(manual.score);
  });

  it('action_item from ai_review gets impact bonus', () => {
    const ai = computePriorityScore({
      ...baseTask, type: 'action_item', source: 'ai_review', priority: 'medium',
    });
    const manual = computePriorityScore({
      ...baseTask, type: 'action_item', source: 'manual', priority: 'medium',
    });
    expect(ai.score).toBeGreaterThan(manual.score);
  });

  it('blocked task gets lower momentum than in-progress', () => {
    const blocked = computePriorityScore({
      ...baseTask, type: 'task', status: 'blocked', priority: 'medium', goal_id: 'g1',
    });
    const inProgress = computePriorityScore({
      ...baseTask, type: 'task', status: 'in_progress', priority: 'medium', goal_id: 'g1',
    });
    expect(blocked.score).toBeLessThan(inProgress.score);
  });

  it('goal near completion (>=90%) gets efficiency bonus', () => {
    const nearDone = computePriorityScore({
      ...baseTask, type: 'goal', progress: 95, priority: 'medium',
    });
    const mid = computePriorityScore({
      ...baseTask, type: 'goal', progress: 50, priority: 'medium',
    });
    expect(nearDone.score).toBeGreaterThan(mid.score);
  });

  it('deviation source action_item gets highest dependency score', () => {
    const deviation = computePriorityScore({
      ...baseTask, type: 'action_item', source: 'deviation', priority: 'high', status: 'open',
    });
    const normal = computePriorityScore({
      ...baseTask, type: 'action_item', source: 'manual', priority: 'high', status: 'open',
    });
    expect(deviation.score).toBeGreaterThan(normal.score);
  });

  it('critical priority action_item gets high impact', () => {
    const result = computePriorityScore({
      ...baseTask, type: 'action_item', priority: 'critical',
    });
    expect(result.tag).toBe('important');
  });

  it('always returns a non-empty reason string', () => {
    const cases = [
      { ...baseTask, type: 'task' as const, priority: 'urgent' as const, due_date: pastDate(1) },
      { ...baseTask, type: 'goal' as const, progress: 80, priority: 'high' as const },
      { ...baseTask, type: 'action_item' as const, status: 'open', priority: 'medium' as const },
      { ...baseTask, type: 'task' as const, priority: 'low' as const, status: 'todo', goal_id: null },
    ];
    for (const c of cases) {
      const result = computePriorityScore(c);
      expect(result.reason.length).toBeGreaterThan(0);
    }
  });

  it('goal with progress >= 70 gets momentum boost', () => {
    const high = computePriorityScore({ ...baseTask, type: 'goal', progress: 80, priority: 'medium' });
    const low = computePriorityScore({ ...baseTask, type: 'goal', progress: 10, priority: 'medium' });
    expect(high.score).toBeGreaterThan(low.score);
  });

  it('in-progress task gets higher momentum than todo', () => {
    const inProg = computePriorityScore({ ...baseTask, type: 'task', status: 'in_progress', priority: 'low' });
    const todo = computePriorityScore({ ...baseTask, type: 'task', status: 'todo', priority: 'low' });
    expect(inProg.score).toBeGreaterThan(todo.score);
  });

  it('score is sum of all five factors and in valid range', () => {
    const result = computePriorityScore({ ...baseTask, due_date: futureDate(10) });
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('action_item in-progress gets higher momentum than default', () => {
    const inProg = computePriorityScore({
      ...baseTask, type: 'action_item', status: 'in_progress', priority: 'medium',
    });
    const open = computePriorityScore({
      ...baseTask, type: 'action_item', status: 'open', priority: 'medium',
    });
    expect(inProg.score).toBeGreaterThan(open.score);
  });

  it('low priority unlinked task without goal gets low efficiency', () => {
    const result = computePriorityScore({
      ...baseTask, type: 'task', priority: 'low', goal_id: null,
    });
    expect(result.tag).toBe('monitor');
  });
});

describe('prioritizeItems', () => {
  it('sorts by priorityScore descending', () => {
    const items: Prioritizable[] = [
      { ...baseTask, id: 'a', priority: 'low', due_date: futureDate(30) },
      { ...baseTask, id: 'b', priority: 'urgent', due_date: pastDate(1) },
      { ...baseTask, id: 'c', priority: 'medium' },
    ];
    const result = prioritizeItems(items);
    expect(result[0].id).toBe('b');
    expect(result).toHaveLength(3);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].priorityScore).toBeGreaterThanOrEqual(result[i].priorityScore);
    }
  });

  it('returns empty array for empty input', () => {
    expect(prioritizeItems([])).toEqual([]);
  });

  it('preserves all original fields plus score/tag/reason', () => {
    const items: Prioritizable[] = [{ ...baseTask, id: 'x' }];
    const result = prioritizeItems(items);
    expect(result[0]).toHaveProperty('priorityScore');
    expect(result[0]).toHaveProperty('focusTag');
    expect(result[0]).toHaveProperty('reason');
    expect(result[0].title).toBe('Test task');
  });

  it('at-risk items appear before normal items', () => {
    const items: Prioritizable[] = [
      { ...baseTask, id: 'normal', priority: 'low', due_date: futureDate(30) },
      { ...baseTask, id: 'at-risk', type: 'goal', priority: 'urgent', progress: 10, due_date: pastDate(2) },
    ];
    const result = prioritizeItems(items);
    expect(result[0].id).toBe('at-risk');
  });

  it('handles single item', () => {
    const result = prioritizeItems([{ ...baseTask, id: 'only' }]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('only');
  });

  it('handles mixed types correctly', () => {
    const items: Prioritizable[] = [
      { ...baseTask, id: 't', type: 'task', priority: 'high', goal_id: 'g1' },
      { ...baseTask, id: 'g', type: 'goal', progress: 50 },
      { ...baseTask, id: 'a', type: 'action_item', status: 'open', priority: 'medium' },
    ];
    const result = prioritizeItems(items);
    expect(result).toHaveLength(3);
    const types = result.map((r) => r.type);
    expect(types).toContain('task');
    expect(types).toContain('goal');
    expect(types).toContain('action_item');
  });
});

describe('generateFocusPlan', () => {
  it('returns empty array for empty input', () => {
    expect(generateFocusPlan([])).toEqual([]);
  });

  it('filters out completed/done items', () => {
    const items: Prioritizable[] = [
      { ...baseTask, id: 'done', type: 'task', done: true },
      { ...baseTask, id: 'cancelled', type: 'task', status: 'cancelled' },
      { ...baseTask, id: 'active', type: 'task', status: 'todo' },
    ];
    const plan = generateFocusPlan(items);
    expect(plan.every((p) => p.id !== 'done' && p.id !== 'cancelled')).toBe(true);
    expect(plan.some((p) => p.id === 'active')).toBe(true);
  });

  it('limits to at most 5 items', () => {
    const items: Prioritizable[] = Array.from({ length: 20 }, (_, i) => ({
      ...baseTask, id: `item-${i}`, priority: 'medium' as const,
    }));
    expect(generateFocusPlan(items).length).toBeLessThanOrEqual(5);
  });

  it('ensures type diversity when available', () => {
    const items: Prioritizable[] = [
      { ...baseTask, id: 't1', type: 'task', priority: 'urgent', due_date: pastDate(1) },
      { ...baseTask, id: 't2', type: 'task', priority: 'high' },
      { ...baseTask, id: 't3', type: 'task', priority: 'medium' },
      { ...baseTask, id: 'g1', type: 'goal', progress: 50 },
      { ...baseTask, id: 'a1', type: 'action_item', status: 'open', priority: 'medium' },
    ];
    const plan = generateFocusPlan(items);
    const types = new Set(plan.map((p) => p.type));
    expect(types.size).toBeGreaterThanOrEqual(2);
  });

  it('results are sorted by priorityScore descending', () => {
    const items: Prioritizable[] = Array.from({ length: 10 }, (_, i) => ({
      ...baseTask, id: `item-${i}`,
      priority: (['low', 'medium', 'high', 'urgent'] as const)[i % 4],
    }));
    const plan = generateFocusPlan(items);
    for (let i = 1; i < plan.length; i++) {
      expect(plan[i - 1].priorityScore).toBeGreaterThanOrEqual(plan[i].priorityScore);
    }
  });

  it('filters out completed goals and action items', () => {
    const items: Prioritizable[] = [
      { ...baseTask, id: 'gc', type: 'goal', status: 'completed' },
      { ...baseTask, id: 'acl', type: 'action_item', status: 'completed' },
      { ...baseTask, id: 'acli', type: 'action_item', closed_loop: true },
      { ...baseTask, id: 'active', type: 'task', status: 'todo' },
    ];
    const plan = generateFocusPlan(items);
    expect(plan.every((p) => p.id === 'active')).toBe(true);
  });

  it('filters tasks with done or cancelled status', () => {
    const items: Prioritizable[] = [
      { ...baseTask, id: 'd1', type: 'task', done: true, status: 'todo' },
      { ...baseTask, id: 'd2', type: 'task', done: false, status: 'done' },
      { ...baseTask, id: 'd3', type: 'task', done: false, status: 'cancelled' },
      { ...baseTask, id: 'active', type: 'task', status: 'in_progress' },
    ];
    const plan = generateFocusPlan(items);
    expect(plan).toHaveLength(1);
    expect(plan[0].id).toBe('active');
  });

  it('works with fewer than 5 items', () => {
    const items: Prioritizable[] = [
      { ...baseTask, id: 'a', type: 'task', priority: 'medium' },
    ];
    const plan = generateFocusPlan(items);
    expect(plan).toHaveLength(1);
  });

  it('includes goals that are not completed', () => {
    const items: Prioritizable[] = [
      { ...baseTask, id: 'g1', type: 'goal', status: 'in_progress', progress: 50 },
      { ...baseTask, id: 'g2', type: 'goal', status: 'completed' },
    ];
    const plan = generateFocusPlan(items);
    expect(plan.some((p) => p.id === 'g1')).toBe(true);
    expect(plan.every((p) => p.id !== 'g2')).toBe(true);
  });
});

describe('FOCUS_TAG_CONFIG', () => {
  it('has config for all 5 focus tags', () => {
    const tags = ['urgent', 'important', 'momentum', 'low-hanging', 'monitor'] as const;
    for (const tag of tags) {
      expect(FOCUS_TAG_CONFIG[tag]).toBeDefined();
      expect(FOCUS_TAG_CONFIG[tag]).toHaveProperty('label');
      expect(FOCUS_TAG_CONFIG[tag]).toHaveProperty('color');
      expect(FOCUS_TAG_CONFIG[tag]).toHaveProperty('icon');
    }
  });

  it('labels are non-empty strings', () => {
    for (const config of Object.values(FOCUS_TAG_CONFIG)) {
      expect(config.label.length).toBeGreaterThan(0);
      expect(typeof config.color).toBe('string');
    }
  });
});
