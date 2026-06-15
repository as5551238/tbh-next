import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase so all dataLayer functions fall back to local data
vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: () => false,
  supabase: null,
}));

import {
  fetchMatrixCell,
  fetchIndustries,
  fetchDepartments,
  fetchGoals,
  fetchTasks,
  fetchProjects,
  fetchMembers,
  fetchKnowledgeDocs,
  fetchNotifications,
  fetchReports,
  fetchApprovals,
  fetchAnnouncements,
  fetchMeetings,
  fetchCollabDocs,
  fetchSharedFiles,
  fetchContacts,
  fetchAgentDetails,
  fetchAgentConfigs,
  fetchRisks,
  fetchWorkflows,
  fetchScheduleEvents,
  fetchOrgInfo,
  fetchRoles,
  fetchPredictions,
  fetchExperiences,
  fetchDocs,
  createGoal,
  updateGoal,
  deleteGoal,
  createTask,
  updateTask,
  deleteTask,
  createProject,
  updateProject,
  deleteProject,
  createMember,
  updateMember,
  deleteMember,
} from '@/lib/dataLayer';

describe('Data Layer (local fallback)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Matrix Core ---

  describe('Matrix operations', () => {
    it('fetchIndustries returns industries', async () => {
      const industries = await fetchIndustries();
      expect(industries.length).toBeGreaterThanOrEqual(4);
      expect(industries).toContain('IT业');
    });

    it('fetchDepartments returns departments for IT业', async () => {
      const depts = await fetchDepartments('IT业');
      expect(depts.length).toBeGreaterThan(0);
    });

    it('fetchDepartments returns empty for unknown industry', async () => {
      const depts = await fetchDepartments('不存在的行业');
      expect(depts).toEqual([]);
    });

    it('fetchMatrixCell returns valid cell for IT业·产品部', async () => {
      const cell = await fetchMatrixCell('IT业', '产品部');
      expect(cell).toBeDefined();
      expect(cell.kpis.length).toBeGreaterThan(0);
      expect(cell.workflow.length).toBeGreaterThan(0);
      expect(cell.agents.length).toBeGreaterThan(0);
    });

    it('fetchMatrixCell returns fallback cell for unknown cell', async () => {
      const cell = await fetchMatrixCell('不存在的行业', '不存在');
      // Should return the first available cell as fallback
      expect(cell).toBeDefined();
    });
  });

  // --- Fetch operations ---

  describe('Fetch operations', () => {
    it('fetchGoals returns at least 1 goal', async () => {
      const goals = await fetchGoals();
      expect(goals.length).toBeGreaterThan(0);
      expect(goals[0].id).toBeTruthy();
    });

    it('fetchTasks returns at least 1 task', async () => {
      const tasks = await fetchTasks();
      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks[0].title).toBeTruthy();
    });

    it('fetchProjects returns at least 1 project', async () => {
      const projects = await fetchProjects();
      expect(projects.length).toBeGreaterThan(0);
    });

    it('fetchMembers returns at least 1 member', async () => {
      const members = await fetchMembers();
      expect(members.length).toBeGreaterThan(0);
    });

    it('fetchKnowledgeDocs returns docs', async () => {
      const docs = await fetchKnowledgeDocs();
      expect(docs.length).toBeGreaterThan(0);
    });

    it('fetchNotifications returns data', async () => {
      const data = await fetchNotifications();
      expect(Array.isArray(data)).toBe(true);
    });

    it('fetchReports returns data', async () => {
      const data = await fetchReports();
      expect(Array.isArray(data)).toBe(true);
    });

    it('fetchApprovals returns data', async () => {
      const data = await fetchApprovals();
      expect(Array.isArray(data)).toBe(true);
    });

    it('fetchAnnouncements returns data', async () => {
      const data = await fetchAnnouncements();
      expect(Array.isArray(data)).toBe(true);
    });

    it('fetchMeetings returns data', async () => {
      const data = await fetchMeetings();
      expect(Array.isArray(data)).toBe(true);
    });

    it('fetchCollabDocs returns data', async () => {
      const data = await fetchCollabDocs();
      expect(Array.isArray(data)).toBe(true);
    });

    it('fetchSharedFiles returns data', async () => {
      const data = await fetchSharedFiles();
      expect(Array.isArray(data)).toBe(true);
    });

    it('fetchContacts returns data', async () => {
      const data = await fetchContacts();
      expect(Array.isArray(data)).toBe(true);
    });

    it('fetchAgentDetails returns data', async () => {
      const data = await fetchAgentDetails();
      expect(Array.isArray(data)).toBe(true);
    });

    it('fetchAgentConfigs returns data', async () => {
      const data = await fetchAgentConfigs();
      expect(Array.isArray(data)).toBe(true);
    });

    it('fetchRisks returns data', async () => {
      const data = await fetchRisks();
      expect(Array.isArray(data)).toBe(true);
    });

    it('fetchWorkflows returns data', async () => {
      const data = await fetchWorkflows();
      expect(Array.isArray(data)).toBe(true);
    });

    it('fetchScheduleEvents returns data', async () => {
      const data = await fetchScheduleEvents();
      expect(Array.isArray(data)).toBe(true);
    });

    it('fetchOrgInfo returns data', async () => {
      const data = await fetchOrgInfo();
      expect(data).toBeDefined();
    });

    it('fetchRoles returns data', async () => {
      const data = await fetchRoles();
      expect(Array.isArray(data)).toBe(true);
    });

    it('fetchPredictions returns data', async () => {
      const data = await fetchPredictions();
      expect(Array.isArray(data)).toBe(true);
    });

    it('fetchExperiences returns data', async () => {
      const data = await fetchExperiences();
      expect(Array.isArray(data)).toBe(true);
    });

    it('fetchDocs returns data', async () => {
      const data = await fetchDocs();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  // --- CRUD operations (local mode) ---

  describe('CRUD operations (local mode)', () => {
    it('createGoal returns object with local id', async () => {
      const goal = await createGoal({
        title: 'Test Goal',
        progress: 0,
         status: 'in_progress',
         key_results: [],
         owner_id: 'Test',
        end_date: null,
        start_date: null,
        leader_id: null,
      });
      expect(goal.id).toMatch(/^g_local_/);
      expect(goal.title).toBe('Test Goal');
    });

    it('updateGoal returns merged object', async () => {
      const goal = await updateGoal('g1', { progress: 80 });
      expect(goal.id).toBe('g1');
      expect(goal.progress).toBe(80);
    });

    it('deleteGoal does not throw', async () => {
      await expect(deleteGoal('g1')).resolves.toBeUndefined();
    });

    it('createTask returns object with local id', async () => {
      const task = await createTask({
        title: 'Test Task',
        priority: 'high',
        assignee_id: 'Alice',
        due_date: '2026-07-01',
        status: 'todo',
        done: false,
        goal_id: null,
        leader_id: null,
      });
      expect(task.id).toMatch(/^t_local_/);
    });

    it('updateTask returns merged object', async () => {
      const task = await updateTask('t1', { done: true });
      expect(task.id).toBe('t1');
      expect(task.done).toBe(true);
    });

    it('deleteTask does not throw', async () => {
      await expect(deleteTask('t1')).resolves.toBeUndefined();
    });

    it('createProject returns object with local id', async () => {
      const project = await createProject({
        title: 'Test Project',
        status: 'planned',
        progress: 0,
        member_ids: [],
        task_count: 0,
        end_date: '2026-12-31',
      });
      expect(project.id).toMatch(/^p_local_/);
    });

    it('updateProject returns merged object', async () => {
      const project = await updateProject('p1', { progress: 50 });
      expect(project.id).toBe('p1');
      expect(project.progress).toBe(50);
    });

    it('deleteProject does not throw', async () => {
      await expect(deleteProject('p1')).resolves.toBeUndefined();
    });

    it('createMember returns object with local id', async () => {
      const member = await createMember({
        name: 'Test Member',
        role: 'tester',
        department: '质量部',
        email: 'test@tbh.ai',
        phone: '13900000000',
        status: 'active',
        avatar: '',
        join_date: '2026-01-01',
        nickname: 'Tester',
      });
      expect(member.id).toMatch(/^m_local_/);
    });

    it('updateMember returns merged object', async () => {
      const member = await updateMember('m1', { name: 'Updated' });
      expect(member.id).toBe('m1');
      expect(member.name).toBe('Updated');
    });

    it('deleteMember does not throw', async () => {
      await expect(deleteMember('m1')).resolves.toBeUndefined();
    });
  });
});
