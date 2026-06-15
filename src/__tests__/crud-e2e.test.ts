import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: () => false,
  supabase: null,
}));
vi.mock('@/lib/behaviorTracker', () => ({ trackEvent: vi.fn() }));
vi.mock('@/lib/monitoring', () => ({
  recordApiCall: vi.fn(),
  recordError: vi.fn(),
  recordRender: vi.fn(),
}));

import {
  fetchGoals, fetchTasks, fetchProjects,
  createGoal, updateGoal, deleteGoal,
  createTask, updateTask, deleteTask,
  createProject, updateProject, deleteProject,
} from '@/lib/dataLayer';

describe('Core CRUD E2E — Goals', () => {
  it('create -> fetch -> update -> delete goal lifecycle', async () => {
    const created = await createGoal({
      title: 'E2E Goal', progress: 0, status: 'in_progress',
      key_results: [], owner_id: 'tester',
      end_date: null, start_date: null, leader_id: null,
    });
    expect(created.id).toBeTruthy();
    expect(created.title).toBe('E2E Goal');

    const goals = await fetchGoals();
    expect(goals.length).toBeGreaterThan(0);

    const updated = await updateGoal(created.id, { progress: 75 });
    expect(updated.progress).toBe(75);

    await expect(deleteGoal(created.id)).resolves.toBeUndefined();
  });
});

describe('Core CRUD E2E — Tasks', () => {
  it('create -> fetch -> update -> delete task lifecycle', async () => {
    const created = await createTask({
      title: 'E2E Task', priority: 'high',
      assignee_id: 'tester', due_date: null,
      status: 'todo', done: false,
      goal_id: null, leader_id: null,
    });
    expect(created.id).toMatch(/^t_local_/);

    const tasks = await fetchTasks();
    expect(tasks.length).toBeGreaterThan(0);

    const done = await updateTask(created.id, { done: true, status: 'done' });
    expect(done.done).toBe(true);

    await expect(deleteTask(created.id)).resolves.toBeUndefined();
  });
});

describe('Core CRUD E2E — Projects', () => {
  it('create -> fetch -> update -> delete project lifecycle', async () => {
    const created = await createProject({
      title: 'E2E Project', status: 'planned',
      progress: 0, member_ids: [],
      task_count: 0, end_date: null,
    });
    expect(created.id).toMatch(/^p_local_/);

    const projects = await fetchProjects();
    expect(projects.length).toBeGreaterThan(0);

    const updated = await updateProject(created.id, { progress: 40, status: 'in_progress' });
    expect(updated.progress).toBe(40);

    await expect(deleteProject(created.id)).resolves.toBeUndefined();
  });
});
