import { withAuthRetry } from '@/lib/authMiddleware';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type {
  AnnouncementInput, AnnouncementUpdate,
  MeetingInput, MeetingUpdate,
  SharedFileInput, SharedFileUpdate,
  ContactInput, ContactUpdate,
  AgentDetailInput, AgentDetailUpdate,
  ApprovalInput,
  ScheduleEventInput, ScheduleEventUpdate,
  DocInput, DocUpdate,
  MessageInput,
  RiskInput, RiskUpdate,
  ReportInput, ReportUpdate,
  PredictionInput, PredictionUpdate,
  ExperienceInput, ExperienceUpdate,
  RoleInput, RoleUpdate,
  ActionItemInput, ActionItemUpdate,
  DeviationAlertInput, DeviationAlertUpdate,
} from '@/contracts/dataContracts';
import type {
  NotificationRow, ReportRow, ApprovalRow, AnnouncementRow,
  MeetingRow, CollabDocRow, SharedFileRow, ContactRow,
  AgentDetailRow, RiskRow,
  ScheduleEventRow, DocRow,
  PredictionRow, ExperienceRow, RoleRow,
} from '@/lib/dataLayerMockData';
import type {
  GoalRow, TaskRow, ProjectRow, MemberRow, KnowledgeDocRow,
  ActionItemRow, DeviationAlertRow,
} from './types';
import { filterColumns } from './columns';

// ======== Goals CRUD ========

export async function createGoal(data: Omit<GoalRow, 'id'>): Promise<GoalRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `g_local_${Date.now()}`, ...data };
  return withAuthRetry(async () => {
    const row = filterColumns('goals', { ...data, team_id: '__default__' } as Record<string, unknown>);
    const { data: result, error } = await supabase!.from('goals').insert(row).select().single();
    if (error) throw error;
    return { ...result, done: result.status === 'done' } as GoalRow;
  });
}

export async function updateGoal(id: string, data: Partial<Omit<GoalRow, 'id'>>): Promise<GoalRow> {
  if (!isSupabaseConfigured() || !supabase) return { id, ...data } as GoalRow;
  const row = filterColumns('goals', data as Record<string, unknown>);
  const { data: result, error } = await supabase!.from('goals').update(row).eq('id', id).select().single();
  if (error) throw error;
  return result as GoalRow;
}

export async function deleteGoal(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase!.from('goals').delete().eq('id', id);
  if (error) throw error;
}

// ======== Tasks CRUD ========

export async function createTask(data: Omit<TaskRow, 'id'>): Promise<TaskRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `t_local_${Date.now()}`, ...data };
  return withAuthRetry(async () => {
    const row = filterColumns('tasks', (() => {
      const r: Record<string, unknown> = { ...data, team_id: '__default__' };
      if (data.done) r.status = 'done';
      delete r.done;
      return r;
    })());
    const { data: result, error } = await supabase!.from('tasks').insert(row).select().single();
    if (error) throw error;
    return { ...result, done: result.status === 'done' } as TaskRow;
  });
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
  const { data: result, error } = await supabase!.from('tasks').update(row).eq('id', id).select().single();
  if (error) throw error;
  return { ...result, done: result.status === 'done' } as TaskRow;
}

export async function deleteTask(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase!.from('tasks').delete().eq('id', id);
  if (error) throw error;
}

// ======== Projects CRUD ========

export async function createProject(data: Omit<ProjectRow, 'id'>): Promise<ProjectRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `p_local_${Date.now()}`, ...data };
  return withAuthRetry(async () => {
    const row = filterColumns('projects', { ...data, team_id: '__default__' } as Record<string, unknown>);
    const { data: result, error } = await supabase!.from('projects').insert(row).select().single();
    if (error) throw error;
    return result as ProjectRow;
  });
}

export async function updateProject(id: string, data: Partial<Omit<ProjectRow, 'id'>>): Promise<ProjectRow> {
  if (!isSupabaseConfigured() || !supabase) return { id, ...data } as ProjectRow;
  const row = filterColumns('projects', data as Record<string, unknown>);
  const { data: result, error } = await supabase!.from('projects').update(row).eq('id', id).select().single();
  if (error) throw error;
  return result as ProjectRow;
}

export async function deleteProject(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase!.from('projects').delete().eq('id', id);
  if (error) throw error;
}

// ======== Members CRUD ========

export async function createMember(data: Omit<MemberRow, 'id'>): Promise<MemberRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `m_local_${Date.now()}`, ...data };
  const row = filterColumns('members', { ...data, team_id: '__default__' } as Record<string, unknown>);
  const { data: result, error } = await supabase!.from('members').insert(row).select().single();
  if (error) throw error;
  return result as MemberRow;
}

export async function updateMember(id: string, data: Partial<Omit<MemberRow, 'id'>>): Promise<MemberRow> {
  if (!isSupabaseConfigured() || !supabase) return { id, ...data } as MemberRow;
  const row = filterColumns('members', data as Record<string, unknown>);
  const { data: result, error } = await supabase!.from('members').update(row).eq('id', id).select().single();
  if (error) throw error;
  return result as MemberRow;
}

export async function deleteMember(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase!.from('members').delete().eq('id', id);
  if (error) throw error;
}

// ======== KnowledgeDocs CRUD ========

export async function createKnowledgeDoc(data: Omit<KnowledgeDocRow, 'id' | 'created_at' | 'updated_at'>): Promise<KnowledgeDocRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `kd_local_${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...data };
  const row = filterColumns('knowledge', { ...data, team_id: '__default__' } as Record<string, unknown>);
  const { data: result, error } = await supabase!.from('knowledge').insert(row).select().single();
  if (error) throw error;
  return row as KnowledgeDocRow;
}

export async function updateKnowledgeDoc(id: string, data: Partial<Omit<KnowledgeDocRow, 'id' | 'created_at' | 'updated_at'>>): Promise<KnowledgeDocRow> {
  if (!isSupabaseConfigured() || !supabase) return { id, created_at: '', updated_at: new Date().toISOString(), ...data } as KnowledgeDocRow;
  const row = filterColumns('knowledge', data as Record<string, unknown>);
  const { data: result, error } = await supabase!.from('knowledge').update(row).eq('id', id).select().single();
  if (error) throw error;
  return row as KnowledgeDocRow;
}

export async function deleteKnowledgeDoc(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase!.from('knowledge').delete().eq('id', id);
  if (error) throw error;
}

// ======== Action Items CRUD ========

export async function fetchActionItems(goalId?: string): Promise<ActionItemRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  let query = supabase!.from('action_items').select('*').order('created_at', { ascending: false });
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

export async function createActionItem(data: ActionItemInput): Promise<ActionItemRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `ai_local_${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...data };
  const row = filterColumns('action_items', { ...data } as Record<string, unknown>);
  const { data: result, error } = await supabase!.from('action_items').insert(row).select().single();
  if (error) throw error;
  return result as ActionItemRow;
}

export async function updateActionItem(id: string, data: ActionItemUpdate): Promise<ActionItemRow> {
  if (!isSupabaseConfigured() || !supabase) return { id, created_at: '', updated_at: new Date().toISOString(), ...data } as ActionItemRow;
  const row = filterColumns('action_items', data as Record<string, unknown>);
  const { data: result, error } = await supabase!.from('action_items').update(row).eq('id', id).select().single();
  if (error) throw error;
  return result as ActionItemRow;
}

export async function deleteActionItem(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase!.from('action_items').delete().eq('id', id);
  if (error) throw error;
}

// ======== Deviation Alerts CRUD ========

export async function fetchDeviationAlerts(unreadOnly?: boolean): Promise<DeviationAlertRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  let query = supabase!.from('deviation_alerts').select('*').order('created_at', { ascending: false });
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

export async function createDeviationAlert(data: DeviationAlertInput): Promise<DeviationAlertRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `da_local_${Date.now()}`, created_at: new Date().toISOString(), ...data };
  const row = filterColumns('deviation_alerts', { ...data } as Record<string, unknown>);
  const { data: result, error } = await supabase!.from('deviation_alerts').insert(row).select().single();
  if (error) throw error;
  return result as DeviationAlertRow;
}

export async function updateDeviationAlert(id: string, data: DeviationAlertUpdate): Promise<DeviationAlertRow> {
  if (!isSupabaseConfigured() || !supabase) return { id, created_at: '', ...data } as DeviationAlertRow;
  const row = filterColumns('deviation_alerts', data as Record<string, unknown>);
  const { data: result, error } = await supabase!.from('deviation_alerts').update(row).eq('id', id).select().single();
  if (error) throw error;
  return result as DeviationAlertRow;
}

export async function markAlertRead(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  await supabase!.from('deviation_alerts').update({ is_read: true }).eq('id', id);
}

export async function markAlertResolved(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  await supabase!.from('deviation_alerts').update({ is_resolved: true, resolved_at: new Date().toISOString() }).eq('id', id);
}

// ======== Announcements CRUD ========

export async function createAnnouncement(data: AnnouncementInput): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase!.from('announcements').insert(data);
  if (error) throw new Error(`createAnnouncement: ${error.message}`);
}

export async function updateAnnouncement(id: string, data: AnnouncementUpdate): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase!.from('announcements').update(data).eq('id', id);
  if (error) throw new Error(`updateAnnouncement: ${error.message}`);
}

export async function deleteAnnouncement(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase!.from('announcements').delete().eq('id', id);
  if (error) throw new Error(`deleteAnnouncement: ${error.message}`);
}

// ======== Meetings CRUD ========

export async function createMeeting(data: MeetingInput): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase!.from('schedule_events').insert({ ...data, type: 'meeting' });
  if (error) throw new Error(`createMeeting: ${error.message}`);
}

export async function updateMeeting(id: string, data: MeetingUpdate): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase!.from('schedule_events').update(data).eq('id', id);
  if (error) throw new Error(`updateMeeting: ${error.message}`);
}

export async function deleteMeeting(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase!.from('schedule_events').delete().eq('id', id);
  if (error) throw new Error(`deleteMeeting: ${error.message}`);
}

// ======== Shared Files CRUD ========

export async function createSharedFile(data: SharedFileInput): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase!.from('shared_files').insert(data);
  if (error) throw new Error(`createSharedFile: ${error.message}`);
}

export async function updateSharedFile(id: string, data: SharedFileUpdate): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase!.from('shared_files').update(data).eq('id', id);
  if (error) throw new Error(`updateSharedFile: ${error.message}`);
}

export async function deleteSharedFile(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase!.from('shared_files').delete().eq('id', id);
  if (error) throw new Error(`deleteSharedFile: ${error.message}`);
}

// ======== Contacts CRUD ========

export async function createContact(data: ContactInput): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase!.from('contacts').insert(data);
  if (error) throw new Error(`createContact: ${error.message}`);
}

export async function updateContact(id: string, data: ContactUpdate): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase!.from('contacts').update(data).eq('id', id);
  if (error) throw new Error(`updateContact: ${error.message}`);
}

export async function deleteContact(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase!.from('contacts').delete().eq('id', id);
  if (error) throw new Error(`deleteContact: ${error.message}`);
}

// ======== Schedule Events CRUD ========

export async function createScheduleEvent(data: ScheduleEventInput): Promise<ScheduleEventRow | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const filtered = filterColumns('schedule_events', data as Record<string, unknown>);
  const { data: row, error } = await supabase!.from('schedule_events').insert(filtered).select().single();
  if (error) { console.error('createScheduleEvent error:', error); return null; }
  return row as ScheduleEventRow;
}

export async function updateScheduleEvent(id: string, data: ScheduleEventUpdate): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase!.from('schedule_events').update(data).eq('id', id);
  if (error) throw new Error(`updateScheduleEvent: ${error.message}`);
}

export async function deleteScheduleEvent(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase!.from('schedule_events').delete().eq('id', id);
  if (error) throw new Error(`deleteScheduleEvent: ${error.message}`);
}

// ======== Docs CRUD ========

export async function createDoc(data: DocInput): Promise<DocRow | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const filtered = filterColumns('docs', data as Record<string, unknown>);
  const { data: row, error } = await supabase!.from('docs').insert(filtered).select().single();
  if (error) { console.error('createDoc error:', error); return null; }
  return row as DocRow;
}

export async function updateDoc(id: string, data: DocUpdate): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase!.from('docs').update(data).eq('id', id);
  if (error) throw new Error(`updateDoc: ${error.message}`);
}

export async function deleteDoc(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase!.from('docs').delete().eq('id', id);
  if (error) throw new Error(`deleteDoc: ${error.message}`);
}

// ======== Collab Docs CRUD ========

export async function createCollabDoc(data: Record<string, unknown>): Promise<CollabDocRow | null> {
  if (!isSupabaseConfigured() || !supabase) {
    const row = { id: `cdoc-${Date.now()}`, ...data } as unknown as CollabDocRow;
    return row;
  }
  const filtered = filterColumns('collab_docs', data);
  const { data: row, error } = await supabase!.from('collab_docs').insert([filtered]).select().single();
  if (error) throw new Error(`createCollabDoc: ${error.message}`);
  return row as unknown as CollabDocRow;
}

export async function updateCollabDoc(id: string, data: Record<string, unknown>): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const filtered = filterColumns('collab_docs', data);
  const { error } = await supabase!.from('collab_docs').update(filtered).eq('id', id);
  if (error) throw new Error(`updateCollabDoc: ${error.message}`);
}

export async function deleteCollabDoc(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase!.from('collab_docs').delete().eq('id', id);
  if (error) throw new Error(`deleteCollabDoc: ${error.message}`);
}

// ======== Messages CRUD ========

export async function fetchMessages(channel: string): Promise<import('./types').MessageRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('channel', channel)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((m) => ({
    id: String(m.id ?? ''),
    channel: String(m.channel ?? ''),
    sender_id: m.sender_id ? String(m.sender_id) : null,
    sender_name: String(m.sender_name ?? ''),
    sender_type: String(m.sender_type ?? 'user') as import('./types').MessageRow['sender_type'],
    content: String(m.content ?? ''),
    team_id: m.team_id ? String(m.team_id) : null,
    created_at: String(m.created_at ?? ''),
  }));
}

export async function createMessage(data: MessageInput): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase!.from('messages').insert(data);
  if (error) throw new Error(`createMessage: ${error.message}`);
}

// ======== Agent Detail CRUD ========

export async function updateAgentDetail(id: string, data: AgentDetailUpdate): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase!.from('agent_details').update(data).eq('id', id);
  if (error) throw new Error(`updateAgentDetail: ${error.message}`);
}

export async function createAgentDetail(data: AgentDetailInput): Promise<AgentDetailRow> {
  if (!isSupabaseConfigured() || !supabase) return {} as AgentDetailRow;
  const filtered = filterColumns('agent_details', data);
  const { data: row, error } = await supabase!.from('agent_details').insert(filtered).select().single();
  if (error) throw new Error(`createAgentDetail: ${error.message}`);
  return row as AgentDetailRow;
}

export async function deleteAgentDetail(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase!.from('agent_details').delete().eq('id', id);
  if (error) throw new Error(`deleteAgentDetail: ${error.message}`);
}

// ======== Approval CRUD ========

export async function createApproval(data: ApprovalInput): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const filtered = filterColumns('approvals', data);
  const { error } = await supabase!.from('approvals').insert(filtered);
  if (error) throw new Error(`createApproval: ${error.message}`);
}

export async function deleteApproval(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase!.from('approvals').delete().eq('id', id);
  if (error) throw new Error(`deleteApproval: ${error.message}`);
}

// ======== Risk CRUD ========

export async function createRisk(data: RiskInput): Promise<RiskRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `risk_local_${Date.now()}`, ...data } as RiskRow;
  const filtered = filterColumns('risks', data as Record<string, unknown>);
  const { data: result, error } = await supabase!.from('risks').insert(filtered).select().single();
  if (error) throw new Error(`createRisk: ${error.message}`);
  return result as RiskRow;
}

export async function updateRisk(id: string, data: RiskUpdate): Promise<RiskRow> {
  if (!isSupabaseConfigured() || !supabase) return { id, ...data } as RiskRow;
  const filtered = filterColumns('risks', data as Record<string, unknown>);
  const { data: result, error } = await supabase!.from('risks').update(filtered).eq('id', id).select().single();
  if (error) throw new Error(`updateRisk: ${error.message}`);
  return result as RiskRow;
}

export async function deleteRisk(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase!.from('risks').delete().eq('id', id);
  if (error) throw new Error(`deleteRisk: ${error.message}`);
}

// ======== Report CRUD ========

export async function createReport(data: ReportInput): Promise<ReportRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `rpt_local_${Date.now()}`, ...data } as ReportRow;
  const filtered = filterColumns('reports', data as Record<string, unknown>);
  const { data: result, error } = await supabase!.from('reports').insert(filtered).select().single();
  if (error) throw new Error(`createReport: ${error.message}`);
  return result as ReportRow;
}

export async function updateReport(id: string, data: ReportUpdate): Promise<ReportRow> {
  if (!isSupabaseConfigured() || !supabase) return { id, ...data } as ReportRow;
  const filtered = filterColumns('reports', data as Record<string, unknown>);
  const { data: result, error } = await supabase!.from('reports').update(filtered).eq('id', id).select().single();
  if (error) throw new Error(`updateReport: ${error.message}`);
  return result as ReportRow;
}

export async function deleteReport(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase!.from('reports').delete().eq('id', id);
  if (error) throw new Error(`deleteReport: ${error.message}`);
}

// ======== Prediction CRUD ========

export async function createPrediction(data: PredictionInput): Promise<PredictionRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `pred_local_${Date.now()}`, ...data } as PredictionRow;
  const filtered = filterColumns('predictions', data as Record<string, unknown>);
  const { data: result, error } = await supabase!.from('predictions').insert(filtered).select().single();
  if (error) throw new Error(`createPrediction: ${error.message}`);
  return result as PredictionRow;
}

export async function updatePrediction(id: string, data: PredictionUpdate): Promise<PredictionRow> {
  if (!isSupabaseConfigured() || !supabase) return { id, ...data } as PredictionRow;
  const filtered = filterColumns('predictions', data as Record<string, unknown>);
  const { data: result, error } = await supabase!.from('predictions').update(filtered).eq('id', id).select().single();
  if (error) throw new Error(`updatePrediction: ${error.message}`);
  return result as PredictionRow;
}

export async function deletePrediction(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase!.from('predictions').delete().eq('id', id);
  if (error) throw new Error(`deletePrediction: ${error.message}`);
}

// ======== Experience CRUD ========

export async function createExperience(data: ExperienceInput): Promise<ExperienceRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `exp_local_${Date.now()}`, ...data } as ExperienceRow;
  const filtered = filterColumns('experiences', data as Record<string, unknown>);
  const { data: result, error } = await supabase!.from('experiences').insert(filtered).select().single();
  if (error) throw new Error(`createExperience: ${error.message}`);
  return result as ExperienceRow;
}

export async function updateExperience(id: string, data: ExperienceUpdate): Promise<ExperienceRow> {
  if (!isSupabaseConfigured() || !supabase) return { id, ...data } as ExperienceRow;
  const filtered = filterColumns('experiences', data as Record<string, unknown>);
  const { data: result, error } = await supabase!.from('experiences').update(filtered).eq('id', id).select().single();
  if (error) throw new Error(`updateExperience: ${error.message}`);
  return result as ExperienceRow;
}

export async function deleteExperience(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase!.from('experiences').delete().eq('id', id);
  if (error) throw new Error(`deleteExperience: ${error.message}`);
}

// ======== Role CRUD ========

export async function createRole(data: RoleInput): Promise<RoleRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `role_local_${Date.now()}`, ...data } as RoleRow;
  const filtered = filterColumns('roles', data as Record<string, unknown>);
  const { data: result, error } = await supabase!.from('roles').insert(filtered).select().single();
  if (error) throw new Error(`createRole: ${error.message}`);
  return result as RoleRow;
}

export async function updateRole(id: string, data: RoleUpdate): Promise<RoleRow> {
  if (!isSupabaseConfigured() || !supabase) return { id, ...data } as RoleRow;
  const filtered = filterColumns('roles', data as Record<string, unknown>);
  const { data: result, error } = await supabase!.from('roles').update(filtered).eq('id', id).select().single();
  if (error) throw new Error(`updateRole: ${error.message}`);
  return result as RoleRow;
}

export async function deleteRole(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase!.from('roles').delete().eq('id', id);
  if (error) throw new Error(`deleteRole: ${error.message}`);
}
