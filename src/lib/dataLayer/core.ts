import { withAuthRetry } from '@/lib/authMiddleware';
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
import type {
  NotificationRow, ReportRow, ApprovalRow, AnnouncementRow,
  MeetingRow, CollabDocRow, SharedFileRow, ContactRow,
  AgentDetailRow, AgentConfigRow, RiskRow, WorkflowRow,
  ScheduleEventRow, OrgInfoRow, RoleRow, PredictionRow,
  ExperienceRow, DocRow,
} from '@/lib/dataLayerMockData';
import type {
  GoalRow, TaskRow, ProjectRow, MemberRow, KnowledgeDocRow,
} from './types';
import { filterColumns } from './columns';

export async function getAuthenticatedUserId(): Promise<string | null> {
  if (isSupabaseConfigured() && supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? null;
    if (import.meta.env.DEV) {
      console.log("[dataLayer] Auth state:", userId ? "authenticated" : "anonymous");
    }
    return userId;
  }
  return "demo-user";
}

// --- Matrix Core ---

export async function fetchMatrixCell(industry: string, dept: string): Promise<MatrixCell> {
  if (!isSupabaseConfigured() || !supabase) {
    return getMatrixCell(industry, dept);
  }

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

export async function checkSupabaseHealth(): Promise<'ok' | 'error'> {
  if (!isSupabaseConfigured() || !supabase) return 'error';
  const { error } = await supabase.from('members').select('id').limit(1);
  return error ? 'error' : 'ok';
}

// --- Core entity fetch functions ---

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
    { id: 'kd1', title: 'Q3产品路线图', content: 'Q3产品路线图详细规划...', tags: ['产品', '规划'], member_id: 'm1', related_items: [], color: 'var(--brand-accent)', created_at: '2026-06-03T00:00:00Z', updated_at: '2026-06-03T00:00:00Z' },
    { id: 'kd2', title: '导出功能优化方案', content: '方案详情...', tags: ['技术', '优化'], member_id: 'm2', related_items: [], color: '#00d4aa', created_at: '2026-06-02T00:00:00Z', updated_at: '2026-06-02T00:00:00Z' },
    { id: 'kd3', title: '客户NPS分析报告', content: '报告内容...', tags: ['运营', '分析'], member_id: 'm3', related_items: [], color: '#ff6b6b', created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z' },
  ];
}

export async function fetchGoals(): Promise<GoalRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localGoals();
  return withAuthRetry(async () => {
    const { data, error } = await supabase.from('goals').select('*').order('created_at', { ascending: false });
    if (error || !data?.length) return localGoals();
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
  });
}

export async function fetchTasks(): Promise<TaskRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localTasks();
  return withAuthRetry(async () => {
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
  });
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

export async function fetchKnowledgeDocs(): Promise<KnowledgeDocRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localKnowledgeDocs();
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

// --- Secondary entity fetch functions ---

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

export async function createNotification(data: Omit<NotificationRow, 'id' | 'created_at' | 'read' | 'team_id'>): Promise<NotificationRow | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const filtered = filterColumns('notifications', { ...data, read: false, team_id: '__default__' } as Record<string, unknown>);
  const { data: row, error } = await supabase.from('notifications').insert(filtered).select().single();
  if (error) { console.error('createNotification error:', error); return null; }
  return row as NotificationRow;
}

export async function fetchReports(): Promise<ReportRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localReports();
  const { data, error } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
  if (error || !data?.length) return localReports();
  return data as ReportRow[];
}

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

export async function fetchAnnouncements(): Promise<AnnouncementRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localAnnouncements();
  const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
  if (error || !data?.length) return localAnnouncements();
  return data as AnnouncementRow[];
}

export async function fetchMeetings(): Promise<MeetingRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localMeetings();
  const { data, error } = await supabase.from('meetings').select('*').order('created_at', { ascending: false });
  if (error || !data?.length) return localMeetings();
  return data as MeetingRow[];
}

export async function fetchCollabDocs(): Promise<CollabDocRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localCollabDocs();
  const { data, error } = await supabase.from('collab_docs').select('*').order('created_at', { ascending: false });
  if (error || !data?.length) return localCollabDocs();
  return data as CollabDocRow[];
}

export async function fetchSharedFiles(): Promise<SharedFileRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localSharedFiles();
  const { data, error } = await supabase.from('shared_files').select('*').order('created_at', { ascending: false });
  if (error || !data?.length) return localSharedFiles();
  return data as SharedFileRow[];
}

export async function fetchContacts(): Promise<ContactRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localContacts();
  const { data, error } = await supabase.from('contacts').select('*').order('created_at', { ascending: false });
  if (error || !data?.length) return localContacts();
  return data as ContactRow[];
}

export async function fetchAgentDetails(): Promise<AgentDetailRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localAgentDetails();
  const { data, error } = await supabase.from('agent_details').select('*').order('sort_order');
  if (error || !data?.length) return localAgentDetails();
  return (data as Record<string, unknown>[]).map((a) => ({
    id: String(a.id ?? ''),
    name: String(a.name ?? ''),
    description: String(a.description ?? ''),
    model: String(a.model ?? ''),
    status: String(a.status ?? 'idle'),
    avatar: String(a.avatar ?? ''),
    skills: Array.isArray(a.skills) ? a.skills as string[] : [],
    config: a.config ?? {},
    tasks_completed: Number(a.tasks_completed ?? 0),
    uptime: String(a.uptime ?? '0%'),
    enabled: Boolean(a.enabled ?? true),
    capabilities: Array.isArray(a.capabilities) ? a.capabilities as string[] : [],
    team_id: String(a.team_id ?? '__default__'),
    created_at: String(a.created_at ?? ''),
    updated_at: String(a.updated_at ?? ''),
  }));
}

export async function fetchAgentConfigs(): Promise<AgentConfigRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localAgentConfigs();
  const { data, error } = await supabase.from('agent_configs').select('*').order('sort_order');
  if (error || !data?.length) return localAgentConfigs();
  return data as AgentConfigRow[];
}

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

export async function fetchRisks(): Promise<RiskRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localRisks();
  const { data, error } = await supabase.from('risks').select('*').order('created_at', { ascending: false });
  if (error || !data?.length) return localRisks();
  return data as RiskRow[];
}

export async function fetchWorkflows(): Promise<WorkflowRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localWorkflows();
  const { data, error } = await supabase.from('workflows').select('*').order('usage_count', { ascending: false });
  if (error || !data?.length) return localWorkflows();
  return data as WorkflowRow[];
}

export async function fetchScheduleEvents(): Promise<ScheduleEventRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localScheduleEvents();
  const { data, error } = await supabase.from('schedule_events').select('*').order('time');
  if (error || !data?.length) return localScheduleEvents();
  return data as ScheduleEventRow[];
}

export async function fetchOrgInfo(): Promise<OrgInfoRow> {
  if (!isSupabaseConfigured() || !supabase) return localOrgInfo();
  const { data, error } = await supabase.from('org_info').select('*').single();
  if (error || !data) return localOrgInfo();
  return data as OrgInfoRow;
}

export async function fetchRoles(): Promise<RoleRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localRoles();
  const { data, error } = await supabase.from('roles').select('*').order('sort_order');
  if (error || !data?.length) return localRoles();
  return data as RoleRow[];
}

export async function fetchPredictions(): Promise<PredictionRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localPredictions();
  const { data, error } = await supabase.from('predictions').select('*').order('created_at', { ascending: false });
  if (error || !data?.length) return localPredictions();
  return data as PredictionRow[];
}

export async function fetchExperiences(): Promise<ExperienceRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localExperiences();
  const { data, error } = await supabase.from('experiences').select('*').order('created_at', { ascending: false });
  if (error || !data?.length) return localExperiences();
  return data as ExperienceRow[];
}

export async function fetchDocs(): Promise<DocRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localDocs();
  const { data, error } = await supabase.from('docs').select('*').order('updated', { ascending: false });
  if (error || !data?.length) return localDocs();
  return data as DocRow[];
}
