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

// --- Column Whitelist (prevents PostgREST 400 on unknown/computed fields) ---

/** Whitelist of real DB columns per table — source: TBH schema.sql + REST API verification */
const TABLE_COLUMNS: Record<string, Set<string>> = {
  goals: new Set([
    'id', 'title', 'description', 'type', 'status', 'parent_id', 'level',
    'start_date', 'end_date', 'owner_id', 'key_results', 'progress',
    'created_at', 'updated_at', 'leader_id', 'supporter_ids',
    'canvas_x', 'canvas_y', 'priority', 'tags', 'category',
    'repeat_cycle', 'discussion_thread_id', 'summary',
    'tracking_records', 'attachments', 'selected_kr_ids', 'team_id', 'deleted_at',
  ]),
  tasks: new Set([
    'id', 'title', 'description', 'project_id', 'goal_id', 'status', 'priority',
    'assignee_id', 'owner_id', 'start_date', 'due_date', 'reminder_date',
    'completed_at', 'subtasks', 'tags', 'created_at', 'updated_at',
    'leader_id', 'supporter_ids', 'canvas_x', 'canvas_y', 'parent_id',
    'category', 'repeat_cycle', 'discussion_thread_id', 'summary',
    'tracking_records', 'attachments', 'blocked_by', 'sprint_id', 'team_id', 'deleted_at',
  ]),
  projects: new Set([
    'id', 'title', 'description', 'goal_id', 'status', 'start_date', 'end_date',
    'owner_id', 'member_ids', 'task_count', 'progress', 'created_at', 'updated_at',
    'leader_id', 'supporter_ids', 'parent_id', 'canvas_x', 'canvas_y', 'priority',
    'tags', 'category', 'repeat_cycle', 'discussion_thread_id', 'summary',
    'tracking_records', 'attachments', 'team_id', 'deleted_at',
  ]),
  members: new Set([
    'id', 'name', 'role', 'department', 'avatar', 'email', 'status',
    'join_date', 'created_at', 'updated_at', 'nickname', 'phone',
    'wechat_id', 'permissions', 'team_id',
  ]),
  notifications: new Set([
    'id', 'type', 'title', 'message', 'related_id', 'related_type',
    'member_id', 'read', 'created_at', 'team_id', 'level',
  ]),
  knowledge: new Set([
    'id', 'title', 'content', 'tags', 'member_id', 'related_items',
    'created_at', 'updated_at', 'team_id', 'color',
  ]),
  action_items: new Set([
    'id', 'title', 'description', 'source', 'source_id', 'goal_id',
    'assignee_id', 'status', 'priority', 'due_date', 'completed_at',
    'closed_loop', 'team_id', 'created_by', 'created_at', 'updated_at',
  ]),
  deviation_alerts: new Set([
    'id', 'goal_id', 'task_id', 'alert_type', 'severity', 'message',
    'is_read', 'is_resolved', 'resolved_at', 'action_item_id', 'team_id', 'created_at',
  ]),
};

/** Columns that reference other tables via FK — empty strings must become null (Postgres treats '' as non-null) */
const FK_COLUMNS = new Set([
  'owner_id', 'leader_id', 'supporter_ids', 'assignee_id', 'parent_id',
  'goal_id', 'project_id', 'member_id', 'linked_item_id', 'source_id',
  'target_id', 'related_id', 'item_id', 'created_by', 'updated_by',
]);

/** Remove keys not in DB column whitelist to prevent PostgREST 400.
 *  Convert empty strings to null for FK columns (Postgres treats '' as non-null). */
function filterColumns(table: string, data: Record<string, unknown>): Record<string, unknown> {
  const allowed = TABLE_COLUMNS[table];
  if (!allowed) return data; // unknown table — pass through
  const filtered: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (!allowed.has(k)) continue;
    filtered[k] = (v === '' && FK_COLUMNS.has(k)) ? null : v;
  }
  return filtered;
}

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
      name: String(k.name ?? ''), value: String(k.value ?? ''), target: String(k.target ?? ''),
      status: k.status as MatrixCell['kpis'][0]['status'],
      trend: k.trend as MatrixCell['kpis'][0]['trend'],
    })) ?? getMatrixCell(industry, dept).kpis,
    workflow: Array.isArray(cell.workflow) ? cell.workflow.map((s: unknown) => String(s)) : [],
    wfCurrent: Number(cell.wf_current ?? 0),
    top3: Array.isArray(cell.top3) ? cell.top3.filter((t: unknown) => typeof t === 'object' && t !== null && 'text' in (t as object)) : [],
    morning: String(cell.morning ?? ''),
    agents: agentRes.data?.map((a: { name: string; description: string; status: string }) => ({
      name: String(a.name ?? ''), desc: String(a.description ?? ''), status: String(a.status ?? ''),
    })) ?? [],
    channels: channelRes.data?.map((c: { name: string }) => String(c.name ?? '')) ?? [],
    ribbon: String(cell.ribbon ?? ''),
    nextStep: String(cell.next_step ?? ''),
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

export interface KeyResultItem {
  id?: string;
  title?: string;
  track?: string;
  selected?: boolean;
  targetValue?: number;
  currentValue?: number;
}

export type KeyResultValue = string | KeyResultItem;

export interface GoalRow {
  id: string;
  title: string;
  progress: number;
  status: string;
  key_results: KeyResultValue[];
  owner_id: string | null;
  leader_id: string | null;
  end_date: string | null;
  start_date: string | null;
}

export async function fetchGoals(): Promise<GoalRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localGoals();
  const { data, error } = await supabase.from('goals').select('*').order('created_at', { ascending: false });
  if (error || !data?.length) return localGoals();
  // Normalize: ensure key_results items are consistently formatted + derive missing fields from real DB
  return (data as Record<string, unknown>[]).map((g) => ({
    id: String(g.id ?? ''),
    title: String(g.title ?? ''),
    progress: Number(g.progress ?? 0),
    status: String(g.status ?? 'todo'),
    key_results: Array.isArray(g.key_results)
      ? g.key_results.map((kr: unknown) => typeof kr === 'string' ? kr : { ...kr as object })
      : [],
    owner_id: g.owner_id ? String(g.owner_id) : null,
    leader_id: g.leader_id ? String(g.leader_id) : null,
    end_date: g.end_date ? String(g.end_date) : null,
    start_date: g.start_date ? String(g.start_date) : null,
  }));
}

// --- Tasks ---

export interface TaskRow {
  id: string;
  title: string;
  priority: string;
  assignee_id: string | null;
  leader_id: string | null;
  due_date: string | null;
  status: string;
  done: boolean;  // derived: status === 'done'
  goal_id: string | null;
}

export async function fetchTasks(): Promise<TaskRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localTasks();
  const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
  if (error || !data?.length) return localTasks();
  return (data as Record<string, unknown>[]).map((t) => ({
    id: String(t.id ?? ''),
    title: String(t.title ?? ''),
    priority: String(t.priority ?? 'medium'),
    assignee_id: t.assignee_id ? String(t.assignee_id) : null,
    leader_id: t.leader_id ? String(t.leader_id) : null,
    due_date: t.due_date ? String(t.due_date) : null,
    status: String(t.status ?? 'todo'),
    done: String(t.status) === 'done',
    goal_id: t.goal_id ? String(t.goal_id) : null,
  }));
}

// --- Projects ---

export interface ProjectRow {
  id: string;
  title: string;
  status: string;
  progress: number;
  member_ids: string[];
  task_count: number;
  end_date: string | null;
}

export async function fetchProjects(): Promise<ProjectRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localProjects();
  const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
  if (error || !data?.length) return localProjects();
  return (data as Record<string, unknown>[]).map((p) => ({
    id: String(p.id ?? ''),
    title: String(p.title ?? ''),
    status: String(p.status ?? 'todo'),
    progress: Number(p.progress ?? 0),
    member_ids: Array.isArray(p.member_ids) ? p.member_ids.map(String) : [],
    task_count: Number(p.task_count ?? 0),
    end_date: p.end_date ? String(p.end_date) : null,
  }));
}

// --- Members ---

export interface MemberRow {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  status: string;
  avatar: string;
  join_date: string;
  nickname: string;
}

export async function fetchMembers(): Promise<MemberRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localMembers();
  const { data, error } = await supabase.from('members').select('*').order('created_at', { ascending: false });
  if (error || !data?.length) return localMembers();
  return (data as Record<string, unknown>[]).map((m) => ({
    id: String(m.id ?? ''),
    name: String(m.name ?? m.nickname ?? ''),
    role: String(m.role ?? 'member'),
    department: String(m.department ?? ''),
    email: String(m.email ?? ''),
    phone: String(m.phone ?? ''),
    status: String(m.status ?? 'active'),
    avatar: String(m.avatar ?? ''),
    join_date: String(m.join_date ?? ''),
    nickname: String(m.nickname ?? ''),
  }));
}

// --- Knowledge Docs ---
// Real DB table is 'knowledge' with columns: id, title, content, tags, member_id, related_items, created_at, updated_at, team_id, color

export interface KnowledgeDocRow {
  id: string;
  title: string;
  content: string;
  tags: string[];
  member_id: string | null;
  related_items: unknown[];
  color: string;
  created_at: string;
  updated_at: string;
}

export async function fetchKnowledgeDocs(): Promise<KnowledgeDocRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localKnowledgeDocs();
  // Real DB table is 'knowledge', not 'knowledge_docs'
  const { data, error } = await supabase.from('knowledge').select('*').order('created_at', { ascending: false });
  if (error || !data?.length) return localKnowledgeDocs();
  return (data as Record<string, unknown>[]).map((k) => ({
    id: String(k.id ?? ''),
    title: String(k.title ?? ''),
    content: String(k.content ?? ''),
    tags: Array.isArray(k.tags) ? k.tags.map(String) : [],
    member_id: k.member_id ? String(k.member_id) : null,
    related_items: Array.isArray(k.related_items) ? k.related_items : [],
    color: String(k.color ?? ''),
    created_at: String(k.created_at ?? ''),
    updated_at: String(k.updated_at ?? ''),
  }));
}

// --- Local mock data fallbacks (used when Supabase is not configured) ---

function localGoals(): GoalRow[] {
  return [
    { id: 'g1', title: 'Q3产品路线图交付', progress: 65, status: 'in_progress', key_results: ['完成3个核心需求交付', 'NPS提升至45+', '需求交付周期≤15天'], owner_id: 'm1', leader_id: 'm1', end_date: '2026-09-30', start_date: '2026-06-01' },
    { id: 'g2', title: '团队效能提升20%', progress: 40, status: 'in_progress', key_results: ['自动化覆盖率≥80%', '迭代准时率≥90%', '技术债减少30%'], owner_id: 'm2', leader_id: 'm2', end_date: '2026-12-31', start_date: '2026-06-01' },
    { id: 'g3', title: '客户满意度提升', progress: 55, status: 'in_progress', key_results: ['客户NPS≥50', '工单响应≤2小时', '功能使用率≥70%'], owner_id: 'm3', leader_id: 'm3', end_date: '2026-09-30', start_date: '2026-06-01' },
  ];
}

function localTasks(): TaskRow[] {
  return [
    { id: 't1', title: '完成Q3路线图评审', priority: 'high', assignee_id: 'm1', leader_id: 'm1', due_date: '2026-06-10', status: 'in_progress', done: false, goal_id: 'g1' },
    { id: 't2', title: '导出功能优化方案', priority: 'high', assignee_id: 'm2', leader_id: 'm2', due_date: '2026-06-12', status: 'todo', done: false, goal_id: 'g1' },
    { id: 't3', title: '自动化测试用例补充', priority: 'medium', assignee_id: 'm3', leader_id: 'm3', due_date: '2026-06-15', status: 'todo', done: false, goal_id: 'g2' },
    { id: 't4', title: '客户反馈整理', priority: 'medium', assignee_id: 'm4', leader_id: 'm4', due_date: '2026-06-08', status: 'done', done: true, goal_id: 'g3' },
    { id: 't5', title: 'NPS问卷设计', priority: 'low', assignee_id: 'm3', leader_id: 'm3', due_date: '2026-06-20', status: 'todo', done: false, goal_id: 'g3' },
  ];
}

function localProjects(): ProjectRow[] {
  return [
    { id: 'p1', title: 'AI同事平台', status: 'in_progress', progress: 35, member_ids: ['m1', 'm2'], task_count: 12, end_date: '2026-12-31' },
    { id: 'p2', title: '数据看板重构', status: 'in_progress', progress: 60, member_ids: ['m2', 'm3'], task_count: 8, end_date: '2026-09-30' },
    { id: 'p3', title: '移动端适配', status: 'todo', progress: 10, member_ids: ['m3'], task_count: 3, end_date: '2026-10-31' },
  ];
}

function localMembers(): MemberRow[] {
  return [
    { id: 'm1', name: '张明', role: 'admin', department: '产品部', email: 'zhangming@tbh.ai', phone: '13800001111', status: 'active', avatar: '张明', join_date: '2024-01-15', nickname: '明' },
    { id: 'm2', name: '李华', role: 'manager', department: '研发部', email: 'lihua@tbh.ai', phone: '13800002222', status: 'active', avatar: '李华', join_date: '2024-03-01', nickname: '华' },
    { id: 'm3', name: '王芳', role: 'member', department: '运营部', email: 'wangfang@tbh.ai', phone: '13800003333', status: 'active', avatar: '王芳', join_date: '2024-05-10', nickname: '芳' },
    { id: 'm4', name: '赵刚', role: 'member', department: '运营部', email: 'zhaogang@tbh.ai', phone: '13800004444', status: 'active', avatar: '赵刚', join_date: '2024-06-20', nickname: '刚' },
  ];
}

function localKnowledgeDocs(): KnowledgeDocRow[] {
  return [
    { id: 'kd1', title: 'Q3产品路线图', content: 'Q3产品路线图详细规划...', tags: ['产品', '规划'], member_id: 'm1', related_items: [], color: '#7b6cf0', created_at: '2026-06-03T00:00:00Z', updated_at: '2026-06-03T00:00:00Z' },
    { id: 'kd2', title: '导出功能优化方案', content: '方案详情...', tags: ['技术', '优化'], member_id: 'm2', related_items: [], color: '#00d4aa', created_at: '2026-06-02T00:00:00Z', updated_at: '2026-06-02T00:00:00Z' },
    { id: 'kd3', title: '客户NPS分析报告', content: '报告内容...', tags: ['运营', '分析'], member_id: 'm3', related_items: [], color: '#ff6b6b', created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z' },
  ];
}

// --- Notifications ---
// Type imported from dataLayerMockData

export async function fetchNotifications(): Promise<NotificationRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localNotifications();
  const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
  if (error || !data?.length) return localNotifications();
  return (data as NotificationRow[]).map((n) => ({
    ...n,
    source: n.related_type ?? '系统',
    time: n.created_at ? new Date(n.created_at).toLocaleString('zh-CN') : '',
  }));
}

export async function createNotification(data: Omit<NotificationRow, 'id' | 'created_at' | 'read' | 'team_id'>): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('notifications').insert({
    ...data,
    read: false,
    team_id: '__default__',
  });
  if (error) throw new Error(`createNotification: ${error.message}`);
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

export async function updateApproval(id: string, data: Partial<ApprovalRow>): Promise<ApprovalRow> {
  if (!isSupabaseConfigured() || !supabase) return { id, ...data } as ApprovalRow;
  const { data: row, error } = await supabase.from('approvals').update(data).eq('id', id).select().single();
  if (error) throw new Error(`updateApproval: ${error.message}`);
  return row as ApprovalRow;
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

/** Upsert a single agent config to Supabase (S8.3) */
export async function saveAgentConfig(config: AgentConfigRow): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    console.warn('Supabase not configured — agent config saved to localStorage only');
    return;
  }
  const { error } = await supabase.from('agent_configs').upsert({
    id: config.id,
    name: config.name,
    model: config.model,
    temperature: config.temperature,
    max_tokens: config.max_tokens,
    system_prompt: config.system_prompt,
    schedule: config.schedule,
    enabled: config.enabled,
    sort_order: 0,
  }, { onConflict: 'id' });
  if (error) throw new Error(`saveAgentConfig failed: ${error.message}`);
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
  const row = filterColumns('goals', { ...data, team_id: '__default__' } as Record<string, unknown>);
  const { data: result, error } = await supabase.from('goals').insert(row).select().single();
  if (error) throw error;
  return { ...result, done: result.status === 'done' } as GoalRow;
}

export async function updateGoal(id: string, data: Partial<Omit<GoalRow, 'id'>>): Promise<GoalRow> {
  if (!isSupabaseConfigured() || !supabase) return { id, ...data } as GoalRow;
  const row = filterColumns('goals', data as Record<string, unknown>);
  const { data: result, error } = await supabase.from('goals').update(row).eq('id', id).select().single();
  if (error) throw error;
  return result as GoalRow;
}

export async function deleteGoal(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('goals').delete().eq('id', id);
  if (error) throw error;
}

export async function createTask(data: Omit<TaskRow, 'id'>): Promise<TaskRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `t_local_${Date.now()}`, ...data };
  // Map done → status for DB, then filter columns
  const row = filterColumns('tasks', (() => {
    const r: Record<string, unknown> = { ...data, team_id: '__default__' };
    if (data.done) r.status = 'done';
    delete r.done; // DB has no 'done' column
    return r;
  })());
  const { data: result, error } = await supabase.from('tasks').insert(row).select().single();
  if (error) throw error;
  return { ...result, done: result.status === 'done' } as TaskRow;
}

export async function updateTask(id: string, data: Partial<Omit<TaskRow, 'id'>>): Promise<TaskRow> {
  if (!isSupabaseConfigured() || !supabase) return { id, ...data } as TaskRow;
  const row = filterColumns('tasks', (() => {
    const r: Record<string, unknown> = { ...data };
    if (data.done !== undefined) {
      r.status = data.done ? 'done' : 'todo';
      delete r.done;
    }
    return r;
  })());
  const { data: result, error } = await supabase.from('tasks').update(row).eq('id', id).select().single();
  if (error) throw error;
  return { ...result, done: result.status === 'done' } as TaskRow;
}

export async function deleteTask(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}

export async function createProject(data: Omit<ProjectRow, 'id'>): Promise<ProjectRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `p_local_${Date.now()}`, ...data };
  const row = filterColumns('projects', { ...data, team_id: '__default__' } as Record<string, unknown>);
  const { data: result, error } = await supabase.from('projects').insert(row).select().single();
  if (error) throw error;
  return result as ProjectRow;
}

export async function updateProject(id: string, data: Partial<Omit<ProjectRow, 'id'>>): Promise<ProjectRow> {
  if (!isSupabaseConfigured() || !supabase) return { id, ...data } as ProjectRow;
  const row = filterColumns('projects', data as Record<string, unknown>);
  const { data: result, error } = await supabase.from('projects').update(row).eq('id', id).select().single();
  if (error) throw error;
  return result as ProjectRow;
}

export async function deleteProject(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}

export async function createMember(data: Omit<MemberRow, 'id'>): Promise<MemberRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `m_local_${Date.now()}`, ...data };
  const row = filterColumns('members', { ...data, team_id: '__default__' } as Record<string, unknown>);
  const { data: result, error } = await supabase.from('members').insert(row).select().single();
  if (error) throw error;
  return result as MemberRow;
}

export async function updateMember(id: string, data: Partial<Omit<MemberRow, 'id'>>): Promise<MemberRow> {
  if (!isSupabaseConfigured() || !supabase) return { id, ...data } as MemberRow;
  const row = filterColumns('members', data as Record<string, unknown>);
  const { data: result, error } = await supabase.from('members').update(row).eq('id', id).select().single();
  if (error) throw error;
  return result as MemberRow;
}

export async function deleteMember(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('members').delete().eq('id', id);
  if (error) throw error;
}

export async function createKnowledgeDoc(data: Omit<KnowledgeDocRow, 'id' | 'created_at' | 'updated_at'>): Promise<KnowledgeDocRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `kd_local_${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...data };
  const row = filterColumns('knowledge', { ...data, team_id: '__default__' } as Record<string, unknown>);
  const { data: result, error } = await supabase.from('knowledge').insert(row).select().single();
  if (error) throw error;
  return row as KnowledgeDocRow;
}

export async function updateKnowledgeDoc(id: string, data: Partial<Omit<KnowledgeDocRow, 'id' | 'created_at' | 'updated_at'>>): Promise<KnowledgeDocRow> {
  if (!isSupabaseConfigured() || !supabase) return { id, created_at: '', updated_at: new Date().toISOString(), ...data } as KnowledgeDocRow;
  const row = filterColumns('knowledge', data as Record<string, unknown>);
  const { data: result, error } = await supabase.from('knowledge').update(row).eq('id', id).select().single();
  if (error) throw error;
  return row as KnowledgeDocRow;
}

export async function deleteKnowledgeDoc(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('knowledge').delete().eq('id', id);
  if (error) throw error;
}

// ======== Action Items (MLOO Loop Core) ========

export interface ActionItemRow {
  id: string;
  title: string;
  description: string;
  source: 'review' | 'deviation' | 'manual' | 'ai_suggested';
  source_id: string | null;
  goal_id: string | null;
  assignee_id: string | null;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  due_date: string | null;
  completed_at: string | null;
  closed_loop: boolean;
  team_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchActionItems(goalId?: string): Promise<ActionItemRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  let query = supabase.from('action_items').select('*').order('created_at', { ascending: false });
  if (goalId) query = query.eq('goal_id', goalId);
  const { data, error } = await query;
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((a) => ({
    id: String(a.id ?? ''),
    title: String(a.title ?? ''),
    description: String(a.description ?? ''),
    source: String(a.source ?? 'manual') as ActionItemRow['source'],
    source_id: a.source_id ? String(a.source_id) : null,
    goal_id: a.goal_id ? String(a.goal_id) : null,
    assignee_id: a.assignee_id ? String(a.assignee_id) : null,
    status: String(a.status ?? 'open') as ActionItemRow['status'],
    priority: String(a.priority ?? 'medium') as ActionItemRow['priority'],
    due_date: a.due_date ? String(a.due_date) : null,
    completed_at: a.completed_at ? String(a.completed_at) : null,
    closed_loop: Boolean(a.closed_loop),
    team_id: String(a.team_id ?? '__default__'),
    created_by: a.created_by ? String(a.created_by) : null,
    created_at: String(a.created_at ?? ''),
    updated_at: String(a.updated_at ?? ''),
  }));
}

export async function createActionItem(data: Omit<ActionItemRow, 'id' | 'created_at' | 'updated_at'>): Promise<ActionItemRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `ai_local_${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...data };
  const row = filterColumns('action_items', { ...data } as Record<string, unknown>);
  const { data: result, error } = await supabase.from('action_items').insert(row).select().single();
  if (error) throw error;
  return result as ActionItemRow;
}

export async function updateActionItem(id: string, data: Partial<Omit<ActionItemRow, 'id' | 'created_at' | 'updated_at'>>): Promise<ActionItemRow> {
  if (!isSupabaseConfigured() || !supabase) return { id, created_at: '', updated_at: new Date().toISOString(), ...data } as ActionItemRow;
  const row = filterColumns('action_items', data as Record<string, unknown>);
  const { data: result, error } = await supabase.from('action_items').update(row).eq('id', id).select().single();
  if (error) throw error;
  return result as ActionItemRow;
}

export async function deleteActionItem(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('action_items').delete().eq('id', id);
  if (error) throw error;
}

// ======== Deviation Alerts (MLOO Loop Core) ========

export interface DeviationAlertRow {
  id: string;
  goal_id: string | null;
  task_id: string | null;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  is_read: boolean;
  is_resolved: boolean;
  resolved_at: string | null;
  action_item_id: string | null;
  team_id: string;
  created_at: string;
}

export async function fetchDeviationAlerts(unreadOnly?: boolean): Promise<DeviationAlertRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  let query = supabase.from('deviation_alerts').select('*').order('created_at', { ascending: false });
  if (unreadOnly) query = query.eq('is_read', false).eq('is_resolved', false);
  const { data, error } = await query;
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((d) => ({
    id: String(d.id ?? ''),
    goal_id: d.goal_id ? String(d.goal_id) : null,
    task_id: d.task_id ? String(d.task_id) : null,
    alert_type: String(d.alert_type ?? ''),
    severity: String(d.severity ?? 'warning') as DeviationAlertRow['severity'],
    message: String(d.message ?? ''),
    is_read: Boolean(d.is_read),
    is_resolved: Boolean(d.is_resolved),
    resolved_at: d.resolved_at ? String(d.resolved_at) : null,
    action_item_id: d.action_item_id ? String(d.action_item_id) : null,
    team_id: String(d.team_id ?? '__default__'),
    created_at: String(d.created_at ?? ''),
  }));
}

export async function createDeviationAlert(data: Omit<DeviationAlertRow, 'id' | 'created_at'>): Promise<DeviationAlertRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `da_local_${Date.now()}`, created_at: new Date().toISOString(), ...data };
  const row = filterColumns('deviation_alerts', { ...data } as Record<string, unknown>);
  const { data: result, error } = await supabase.from('deviation_alerts').insert(row).select().single();
  if (error) throw error;
  return result as DeviationAlertRow;
}

export async function updateDeviationAlert(id: string, data: Partial<Omit<DeviationAlertRow, 'id' | 'created_at'>>): Promise<DeviationAlertRow> {
  if (!isSupabaseConfigured() || !supabase) return { id, created_at: '', ...data } as DeviationAlertRow;
  const row = filterColumns('deviation_alerts', data as Record<string, unknown>);
  const { data: result, error } = await supabase.from('deviation_alerts').update(row).eq('id', id).select().single();
  if (error) throw error;
  return result as DeviationAlertRow;
}

export async function markAlertRead(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  await supabase.from('deviation_alerts').update({ is_read: true }).eq('id', id);
}

export async function markAlertResolved(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  await supabase.from('deviation_alerts').update({ is_resolved: true, resolved_at: new Date().toISOString() }).eq('id', id);
}

// ======== Announcements CRUD ========

export async function createAnnouncement(data: Record<string, unknown>): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('announcements').insert(data);
  if (error) throw new Error(`createAnnouncement: ${error.message}`);
}

export async function updateAnnouncement(id: string, data: Record<string, unknown>): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('announcements').update(data).eq('id', id);
  if (error) throw new Error(`updateAnnouncement: ${error.message}`);
}

export async function deleteAnnouncement(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) throw new Error(`deleteAnnouncement: ${error.message}`);
}

// ======== Meetings CRUD ========

export async function createMeeting(data: Record<string, unknown>): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('schedule_events').insert({ ...data, type: 'meeting' });
  if (error) throw new Error(`createMeeting: ${error.message}`);
}

export async function updateMeeting(id: string, data: Record<string, unknown>): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('schedule_events').update(data).eq('id', id);
  if (error) throw new Error(`updateMeeting: ${error.message}`);
}

export async function deleteMeeting(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('schedule_events').delete().eq('id', id);
  if (error) throw new Error(`deleteMeeting: ${error.message}`);
}

// ======== Shared Files CRUD ========

export async function createSharedFile(data: Record<string, unknown>): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('shared_files').insert(data);
  if (error) throw new Error(`createSharedFile: ${error.message}`);
}

export async function updateSharedFile(id: string, data: Record<string, unknown>): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('shared_files').update(data).eq('id', id);
  if (error) throw new Error(`updateSharedFile: ${error.message}`);
}

export async function deleteSharedFile(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('shared_files').delete().eq('id', id);
  if (error) throw new Error(`deleteSharedFile: ${error.message}`);
}

// ======== Contacts CRUD ========

export async function createContact(data: Record<string, unknown>): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('contacts').insert(data);
  if (error) throw new Error(`createContact: ${error.message}`);
}

export async function updateContact(id: string, data: Record<string, unknown>): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('contacts').update(data).eq('id', id);
  if (error) throw new Error(`updateContact: ${error.message}`);
}

export async function deleteContact(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('contacts').delete().eq('id', id);
  if (error) throw new Error(`deleteContact: ${error.message}`);
}

// ======== Schedule Events CRUD ========

export async function createScheduleEvent(data: Record<string, unknown>): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('schedule_events').insert(data);
  if (error) throw new Error(`createScheduleEvent: ${error.message}`);
}

export async function updateScheduleEvent(id: string, data: Record<string, unknown>): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('schedule_events').update(data).eq('id', id);
  if (error) throw new Error(`updateScheduleEvent: ${error.message}`);
}

export async function deleteScheduleEvent(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('schedule_events').delete().eq('id', id);
  if (error) throw new Error(`deleteScheduleEvent: ${error.message}`);
}

// ======== Docs CRUD ========

export async function createDoc(data: Record<string, unknown>): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('docs').insert(data);
  if (error) throw new Error(`createDoc: ${error.message}`);
}

export async function updateDoc(id: string, data: Record<string, unknown>): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('docs').update(data).eq('id', id);
  if (error) throw new Error(`updateDoc: ${error.message}`);
}

export async function deleteDoc(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('docs').delete().eq('id', id);
  if (error) throw new Error(`deleteDoc: ${error.message}`);
}

// ======== Messages CRUD ========

export async function createMessage(data: Record<string, unknown>): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('messages').insert(data);
  if (error) throw new Error(`createMessage: ${error.message}`);
}

// ======== Agent Detail CRUD ========

export async function updateAgentDetail(id: string, data: Record<string, unknown>): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('agent_details').update(data).eq('id', id);
  if (error) throw new Error(`updateAgentDetail: ${error.message}`);
}

export async function createAgentDetail(data: Record<string, unknown>): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('agent_details').insert(data);
  if (error) throw new Error(`createAgentDetail: ${error.message}`);
}
