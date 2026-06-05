import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { MatrixCell } from '@/matrix/data';
import { MATRIX, getMatrixCell } from '@/matrix/data';
import {
  localNotifications, localReports, localApprovals, localAnnouncements,
  localMeetings, localCollabDocs, localSharedFiles, localContacts,
  localAgentDetails, localAgentConfigs, localRisks, localWorkflows,
  localScheduleEvents, localOrgInfo, localRoles, localPredictions,
  localExperiences, localDocs,
} from '@/lib/dataLayerMockData';

// Re-export types from mockData module so existing imports still work
export type {
  NotificationRow, ReportRow, ApprovalRow, AnnouncementRow,
  MeetingRow, CollabDocRow, SharedFileRow, ContactRow,
  AgentDetailRow, AgentConfigRow, RiskRow, WorkflowRow,
  ScheduleEventRow, OrgInfoRow, RoleRow, PredictionRow,
  ExperienceRow, DocRow,
} from '@/lib/dataLayerMockData';

/**
 * Data layer abstraction.
 * When Supabase is configured, reads from DB;
 * otherwise falls back to local MATRIX mock data.
 */

// --- Matrix Core ---

export async function fetchMatrixCell(industry: string, dept: string): Promise<MatrixCell> {
  if (!isSupabaseConfigured() || !supabase) {
    return getMatrixCell(industry, dept);
  }

  // Fetch cell + related data in parallel
  const [cellRes, kpiRes, agentRes, channelRes] = await Promise.all([
    supabase.from('matrix_cells').select('*').eq('industry', industry).eq('dept', dept).single(),
    supabase.from('kpis').select('*').eq('industry', industry).eq('dept', dept).order('sort_order'),
    supabase.from('agents').select('*').eq('industry', industry).eq('dept', dept).order('sort_order'),
    supabase.from('channels').select('*').eq('industry', industry).eq('dept', dept).order('sort_order'),
  ]);

  if (cellRes.error || !cellRes.data) {
    return getMatrixCell(industry, dept);
  }

  const cell = cellRes.data;
  return {
    kpis: kpiRes.data?.map((k: { name: string; value: string; target: string; status: string; trend: string }) => ({
      name: k.name, value: k.value, target: k.target,
      status: k.status as MatrixCell['kpis'][0]['status'],
      trend: k.trend as MatrixCell['kpis'][0]['trend'],
    })) ?? getMatrixCell(industry, dept).kpis,
    workflow: cell.workflow ?? [],
    wfCurrent: cell.wf_current ?? 0,
    top3: cell.top3 ?? [],
    morning: cell.morning ?? '',
    agents: agentRes.data?.map((a: { name: string; description: string; status: string }) => ({
      name: a.name, desc: a.description, status: a.status,
    })) ?? [],
    channels: channelRes.data?.map((c: { name: string }) => c.name) ?? [],
    ribbon: cell.ribbon ?? '',
    nextStep: cell.next_step ?? '',
  } as MatrixCell;
}

export async function fetchIndustries(): Promise<string[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return Object.keys(MATRIX);
  }
  const { data, error } = await supabase.from('industries').select('name, color').order('sort_order');
  if (error || !data?.length) return Object.keys(MATRIX);
  return data.map((d: { name: string }) => d.name);
}

export async function fetchDepartments(industry: string): Promise<string[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return Object.keys(MATRIX[industry] ?? {});
  }
  const { data, error } = await supabase.from('departments').select('name').eq('industry', industry).order('sort_order');
  if (error || !data?.length) return Object.keys(MATRIX[industry] ?? {});
  return data.map((d: { name: string }) => d.name);
}

// --- Goals ---

export interface GoalRow {
  id: string;
  title: string;
  progress: number;
  status: string;
  key_results: string[];
  owner: string;
  due_date: string | null;
}

export async function fetchGoals(): Promise<GoalRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localGoals();
  const { data, error } = await supabase.from('goals').select('*').order('created_at', { ascending: false });
  if (error || !data?.length) return localGoals();
  return data as GoalRow[];
}

// --- Tasks ---

export interface TaskRow {
  id: string;
  title: string;
  priority: string;
  assignee: string;
  due: string;
  done: boolean;
  goal_id: string | null;
}

export async function fetchTasks(): Promise<TaskRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localTasks();
  const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
  if (error || !data?.length) return localTasks();
  return data as TaskRow[];
}

// --- Projects ---

export interface ProjectRow {
  id: string;
  name: string;
  status: string;
  progress: number;
  members: number;
  deadline: string;
}

export async function fetchProjects(): Promise<ProjectRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localProjects();
  const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
  if (error || !data?.length) return localProjects();
  return data as ProjectRow[];
}

// --- Members ---

export interface MemberRow {
  id: string;
  name: string;
  role: string;
  dept: string;
  email: string;
  phone: string;
  status: string;
}

export async function fetchMembers(): Promise<MemberRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localMembers();
  const { data, error } = await supabase.from('members').select('*').order('created_at', { ascending: false });
  if (error || !data?.length) return localMembers();
  return data as MemberRow[];
}

// --- Knowledge Docs ---

export interface KnowledgeDocRow {
  id: string;
  title: string;
  type: string;
  author: string;
  updated: string;
}

export async function fetchKnowledgeDocs(): Promise<KnowledgeDocRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localKnowledgeDocs();
  const { data, error } = await supabase.from('knowledge_docs').select('*').order('created_at', { ascending: false });
  if (error || !data?.length) return localKnowledgeDocs();
  return data as KnowledgeDocRow[];
}

// --- Local mock data fallbacks (used when Supabase is not configured) ---

function localGoals(): GoalRow[] {
  return [
    { id: 'g1', title: 'Q3产品路线图交付', progress: 65, status: 'active', key_results: ['完成3个核心需求交付', 'NPS提升至45+', '需求交付周期≤15天'], owner: '张明', due_date: '2026-09-30' },
    { id: 'g2', title: '团队效能提升20%', progress: 40, status: 'active', key_results: ['自动化覆盖率≥80%', '迭代准时率≥90%', '技术债减少30%'], owner: '李华', due_date: '2026-12-31' },
    { id: 'g3', title: '客户满意度提升', progress: 55, status: 'active', key_results: ['客户NPS≥50', '工单响应≤2小时', '功能使用率≥70%'], owner: '王芳', due_date: '2026-09-30' },
  ];
}

function localTasks(): TaskRow[] {
  return [
    { id: 't1', title: '完成Q3路线图评审', priority: 'high', assignee: '张明', due: '2026-06-10', done: false, goal_id: 'g1' },
    { id: 't2', title: '导出功能优化方案', priority: 'high', assignee: '李华', due: '2026-06-12', done: false, goal_id: 'g1' },
    { id: 't3', title: '自动化测试用例补充', priority: 'medium', assignee: '王芳', due: '2026-06-15', done: false, goal_id: 'g2' },
    { id: 't4', title: '客户反馈整理', priority: 'medium', assignee: '赵刚', due: '2026-06-08', done: true, goal_id: 'g3' },
    { id: 't5', title: 'NPS问卷设计', priority: 'low', assignee: '王芳', due: '2026-06-20', done: false, goal_id: 'g3' },
  ];
}

function localProjects(): ProjectRow[] {
  return [
    { id: 'p1', name: 'AI同事平台', status: 'active', progress: 35, members: 8, deadline: '2026-12-31' },
    { id: 'p2', name: '数据看板重构', status: 'active', progress: 60, members: 5, deadline: '2026-09-30' },
    { id: 'p3', name: '移动端适配', status: 'planned', progress: 10, members: 3, deadline: '2026-10-31' },
  ];
}

function localMembers(): MemberRow[] {
  return [
    { id: 'm1', name: '张明', role: '产品经理', dept: '产品部', email: 'zhangming@tbh.ai', phone: '13800001111', status: 'active' },
    { id: 'm2', name: '李华', role: '技术负责人', dept: '研发部', email: 'lihua@tbh.ai', phone: '13800002222', status: 'active' },
    { id: 'm3', name: '王芳', role: '运营经理', dept: '运营部', email: 'wangfang@tbh.ai', phone: '13800003333', status: 'active' },
    { id: 'm4', name: '赵刚', role: '客服主管', dept: '运营部', email: 'zhaogang@tbh.ai', phone: '13800004444', status: 'active' },
  ];
}

function localKnowledgeDocs(): KnowledgeDocRow[] {
  return [
    { id: 'kd1', title: 'Q3产品路线图', type: 'doc', author: '张明', updated: '2026-06-03' },
    { id: 'kd2', title: '导出功能优化方案', type: 'doc', author: '李华', updated: '2026-06-02' },
    { id: 'kd3', title: '客户NPS分析报告', type: 'report', author: '王芳', updated: '2026-06-01' },
  ];
}

// --- Notifications ---
// Type imported from dataLayerMockData

export async function fetchNotifications(): Promise<NotificationRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localNotifications();
  const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
  if (error || !data?.length) return localNotifications();
  return data as NotificationRow[];
}

// --- Reports ---

export async function fetchReports(): Promise<ReportRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localReports();
  const { data, error } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
  if (error || !data?.length) return localReports();
  return data as ReportRow[];
}

// --- Approvals ---

export async function fetchApprovals(): Promise<ApprovalRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localApprovals();
  const { data, error } = await supabase.from('approvals').select('*').order('created_at', { ascending: false });
  if (error || !data?.length) return localApprovals();
  return data as ApprovalRow[];
}

// --- Announcements ---

export async function fetchAnnouncements(): Promise<AnnouncementRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localAnnouncements();
  const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
  if (error || !data?.length) return localAnnouncements();
  return data as AnnouncementRow[];
}

// --- Meetings ---

export async function fetchMeetings(): Promise<MeetingRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localMeetings();
  const { data, error } = await supabase.from('meetings').select('*').order('created_at', { ascending: false });
  if (error || !data?.length) return localMeetings();
  return data as MeetingRow[];
}

// --- Collab Docs ---

export async function fetchCollabDocs(): Promise<CollabDocRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localCollabDocs();
  const { data, error } = await supabase.from('collab_docs').select('*').order('created_at', { ascending: false });
  if (error || !data?.length) return localCollabDocs();
  return data as CollabDocRow[];
}

// --- Shared Files ---

export async function fetchSharedFiles(): Promise<SharedFileRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localSharedFiles();
  const { data, error } = await supabase.from('shared_files').select('*').order('created_at', { ascending: false });
  if (error || !data?.length) return localSharedFiles();
  return data as SharedFileRow[];
}

// --- Contacts ---

export async function fetchContacts(): Promise<ContactRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localContacts();
  const { data, error } = await supabase.from('contacts').select('*').order('created_at', { ascending: false });
  if (error || !data?.length) return localContacts();
  return data as ContactRow[];
}

// --- Agent Details ---

export async function fetchAgentDetails(): Promise<AgentDetailRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localAgentDetails();
  const { data, error } = await supabase.from('agent_details').select('*').order('sort_order');
  if (error || !data?.length) return localAgentDetails();
  return data as AgentDetailRow[];
}

// --- Agent Configs ---

export async function fetchAgentConfigs(): Promise<AgentConfigRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localAgentConfigs();
  const { data, error } = await supabase.from('agent_configs').select('*').order('sort_order');
  if (error || !data?.length) return localAgentConfigs();
  return data as AgentConfigRow[];
}

// --- Risks ---

export async function fetchRisks(): Promise<RiskRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localRisks();
  const { data, error } = await supabase.from('risks').select('*').order('created_at', { ascending: false });
  if (error || !data?.length) return localRisks();
  return data as RiskRow[];
}

// --- Workflows ---

export async function fetchWorkflows(): Promise<WorkflowRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localWorkflows();
  const { data, error } = await supabase.from('workflows').select('*').order('usage_count', { ascending: false });
  if (error || !data?.length) return localWorkflows();
  return data as WorkflowRow[];
}

// --- Schedule Events ---

export async function fetchScheduleEvents(): Promise<ScheduleEventRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localScheduleEvents();
  const { data, error } = await supabase.from('schedule_events').select('*').order('time');
  if (error || !data?.length) return localScheduleEvents();
  return data as ScheduleEventRow[];
}

// --- Org Info ---

export async function fetchOrgInfo(): Promise<OrgInfoRow> {
  if (!isSupabaseConfigured() || !supabase) return localOrgInfo();
  const { data, error } = await supabase.from('org_info').select('*').single();
  if (error || !data) return localOrgInfo();
  return data as OrgInfoRow;
}

// --- Roles ---

export async function fetchRoles(): Promise<RoleRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localRoles();
  const { data, error } = await supabase.from('roles').select('*').order('sort_order');
  if (error || !data?.length) return localRoles();
  return data as RoleRow[];
}

// --- Predictions ---

export async function fetchPredictions(): Promise<PredictionRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localPredictions();
  const { data, error } = await supabase.from('predictions').select('*').order('created_at', { ascending: false });
  if (error || !data?.length) return localPredictions();
  return data as PredictionRow[];
}

// --- Experiences ---

export async function fetchExperiences(): Promise<ExperienceRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localExperiences();
  const { data, error } = await supabase.from('experiences').select('*').order('created_at', { ascending: false });
  if (error || !data?.length) return localExperiences();
  return data as ExperienceRow[];
}

// --- Docs ---

export async function fetchDocs(): Promise<DocRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localDocs();
  const { data, error } = await supabase.from('docs').select('*').order('updated', { ascending: false });
  if (error || !data?.length) return localDocs();
  return data as DocRow[];
}

// ======== CRUD Operations ========
// When Supabase is configured, these write to DB.
// Otherwise they return success (local-only mode has no persistence).

export async function createGoal(data: Omit<GoalRow, 'id'>): Promise<GoalRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `g_local_${Date.now()}`, ...data };
  const { data: row, error } = await supabase.from('goals').insert(data).select().single();
  if (error) throw error;
  return row as GoalRow;
}

export async function updateGoal(id: string, data: Partial<Omit<GoalRow, 'id'>>): Promise<GoalRow> {
  if (!isSupabaseConfigured() || !supabase) return { id, ...data } as GoalRow;
  const { data: row, error } = await supabase.from('goals').update(data).eq('id', id).select().single();
  if (error) throw error;
  return row as GoalRow;
}

export async function deleteGoal(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('goals').delete().eq('id', id);
  if (error) throw error;
}

export async function createTask(data: Omit<TaskRow, 'id'>): Promise<TaskRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `t_local_${Date.now()}`, ...data };
  const { data: row, error } = await supabase.from('tasks').insert(data).select().single();
  if (error) throw error;
  return row as TaskRow;
}

export async function updateTask(id: string, data: Partial<Omit<TaskRow, 'id'>>): Promise<TaskRow> {
  if (!isSupabaseConfigured() || !supabase) return { id, ...data } as TaskRow;
  const { data: row, error } = await supabase.from('tasks').update(data).eq('id', id).select().single();
  if (error) throw error;
  return row as TaskRow;
}

export async function deleteTask(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}

export async function createProject(data: Omit<ProjectRow, 'id'>): Promise<ProjectRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `p_local_${Date.now()}`, ...data };
  const { data: row, error } = await supabase.from('projects').insert(data).select().single();
  if (error) throw error;
  return row as ProjectRow;
}

export async function updateProject(id: string, data: Partial<Omit<ProjectRow, 'id'>>): Promise<ProjectRow> {
  if (!isSupabaseConfigured() || !supabase) return { id, ...data } as ProjectRow;
  const { data: row, error } = await supabase.from('projects').update(data).eq('id', id).select().single();
  if (error) throw error;
  return row as ProjectRow;
}

export async function deleteProject(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}

export async function createMember(data: Omit<MemberRow, 'id'>): Promise<MemberRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `m_local_${Date.now()}`, ...data };
  const { data: row, error } = await supabase.from('members').insert(data).select().single();
  if (error) throw error;
  return row as MemberRow;
}

export async function updateMember(id: string, data: Partial<Omit<MemberRow, 'id'>>): Promise<MemberRow> {
  if (!isSupabaseConfigured() || !supabase) return { id, ...data } as MemberRow;
  const { data: row, error } = await supabase.from('members').update(data).eq('id', id).select().single();
  if (error) throw error;
  return row as MemberRow;
}

export async function deleteMember(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('members').delete().eq('id', id);
  if (error) throw error;
}

export async function createKnowledgeDoc(data: Omit<KnowledgeDocRow, 'id'>): Promise<KnowledgeDocRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `kd_local_${Date.now()}`, ...data };
  const { data: row, error } = await supabase.from('knowledge_docs').insert(data).select().single();
  if (error) throw error;
  return row as KnowledgeDocRow;
}

export async function updateKnowledgeDoc(id: string, data: Partial<Omit<KnowledgeDocRow, 'id'>>): Promise<KnowledgeDocRow> {
  if (!isSupabaseConfigured() || !supabase) return { id, ...data } as KnowledgeDocRow;
  const { data: row, error } = await supabase.from('knowledge_docs').update(data).eq('id', id).select().single();
  if (error) throw error;
  return row as KnowledgeDocRow;
}

export async function deleteKnowledgeDoc(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('knowledge_docs').delete().eq('id', id);
  if (error) throw error;
}
