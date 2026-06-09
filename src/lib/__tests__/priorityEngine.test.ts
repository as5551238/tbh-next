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
  id: 't1',
  title: 'Test task',
  type: 'task',
  priority: 'medium',
  status: 'todo',
  progress: 0,
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
      ...baseTask,
      type: 'goal',
      priority: 'high',
    });
    expect(result.tag).toBe('important');
  });

  it('tags in-progress tasks with momentum when not urgent/important', () => {
    const result = computePriorityScore({
      ...baseTask,
      type: 'task',
      priority: 'low',
      status: 'in_progress',
    });
    expect(result.tag).toBe('momentum');
  });

  it('tags quick-win action_item as low-hanging', () => {
    const result = computePriorityScore({
      ...baseTask,
      type: 'action_item',
      status: 'open',
      priority: 'medium',
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
      ...baseTask,
      type: 'task',
      priority: 'low',
      status: 'todo',
      goal_id: null,
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
      ...baseTask,
      id: `item-${i}`,
      priority: 'medium' as const,
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
      ...baseTask,
      id: `item-${i}`,
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
