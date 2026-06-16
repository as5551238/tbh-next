import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type {
  InsightInput, InsightUpdate,
  WorkflowInstanceInput, WorkflowInstanceUpdate,
  OrgInfoUpdate,
} from '@/contracts/dataContracts';
import type {
  OrgInfoRow,
  ActivityRow, NoteRow,
} from '@/lib/dataLayerMockData';
import {
  localActivities, localNotes,
} from '@/lib/dataLayerMockData';
import type {
  InsightRow, WorkflowInstanceRow, ChannelRow,
} from './types';
import { filterColumns } from './columns';

async function safeFetch<T>(
  table: string,
  select: string,
  orderCol: string,
  ascending: boolean,
): Promise<T[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .order(orderCol, { ascending });
  if (error || !data) return [];
  return data as T[];
}

// ======== Insights ========

export async function fetchInsights(): Promise<InsightRow[]> {
  const rows = await safeFetch<InsightRow>('insights', '*', 'created_at', false);
  return rows;
}

export async function createInsight(data: InsightInput): Promise<InsightRow> {
  if (!isSupabaseConfigured() || !supabase) return {} as InsightRow;
  const filtered = filterColumns('insights', data as unknown as Record<string,unknown>);
  const { data: result, error } = await supabase.from('insights').insert(filtered).select().single();
  if (error) throw new Error(`createInsight: ${error.message}`);
  return result as InsightRow;
}

export async function updateInsight(id: string, data: InsightUpdate): Promise<InsightRow> {
  if (!isSupabaseConfigured() || !supabase) return {} as InsightRow;
  const filtered = filterColumns('insights', data as unknown as Record<string,unknown>);
  const { data: result, error } = await supabase.from('insights').update(filtered).eq('id', id).select().single();
  if (error) throw new Error(`updateInsight: ${error.message}`);
  return result as InsightRow;
}

export async function deleteInsight(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('insights').delete().eq('id', id);
  if (error) throw new Error(`deleteInsight: ${error.message}`);
}

// ======== WorkflowInstances ========

export async function fetchWorkflowInstances(): Promise<WorkflowInstanceRow[]> {
  const rows = await safeFetch<WorkflowInstanceRow>('workflow_instances', '*', 'created_at', false);
  return rows;
}

export async function createWorkflowInstance(data: WorkflowInstanceInput): Promise<WorkflowInstanceRow> {
  if (!isSupabaseConfigured() || !supabase) return {} as WorkflowInstanceRow;
  const filtered = filterColumns('workflow_instances', data as unknown as Record<string,unknown>);
  const { data: result, error } = await supabase.from('workflow_instances').insert(filtered).select().single();
  if (error) throw new Error(`createWorkflowInstance: ${error.message}`);
  return result as WorkflowInstanceRow;
}

export async function updateWorkflowInstance(id: string, data: WorkflowInstanceUpdate): Promise<WorkflowInstanceRow> {
  if (!isSupabaseConfigured() || !supabase) return {} as WorkflowInstanceRow;
  const filtered = filterColumns('workflow_instances', data as unknown as Record<string,unknown>);
  const { data: result, error } = await supabase.from('workflow_instances').update(filtered).eq('id', id).select().single();
  if (error) throw new Error(`updateWorkflowInstance: ${error.message}`);
  return result as WorkflowInstanceRow;
}

export async function deleteWorkflowInstance(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('workflow_instances').delete().eq('id', id);
  if (error) throw new Error(`deleteWorkflowInstance: ${error.message}`);
}

// ======== Channels CRUD ========

export async function fetchChannels(industry: string, dept: string): Promise<ChannelRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase.from('channels').select('*').eq('industry', industry).eq('dept', dept).order('sort_order');
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((c) => ({
    id: String(c.id ?? ''),
    industry: String(c.industry ?? ''),
    dept: String(c.dept ?? ''),
    name: String(c.name ?? ''),
    sort_order: Number(c.sort_order ?? 0),
    created_at: String(c.created_at ?? ''),
    updated_at: String(c.updated_at ?? ''),
  }));
}

export async function createChannel(data: Pick<ChannelRow, 'industry' | 'dept' | 'name'> & { sort_order?: number }): Promise<ChannelRow | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const { data: result, error } = await supabase.from('channels').insert({
    industry: data.industry,
    dept: data.dept,
    name: data.name,
    sort_order: data.sort_order ?? 0,
  }).select().single();
  if (error) { console.error('createChannel error:', error); return null; }
  return result as ChannelRow;
}

export async function deleteChannel(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('channels').delete().eq('id', id);
  if (error) throw new Error(`deleteChannel: ${error.message}`);
}

// ======== OrgInfo Save ========

export async function saveOrgInfo(data: OrgInfoUpdate): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const filtered = filterColumns('org_info', data as Record<string, unknown>);
  const { error } = await supabase.from('org_info').upsert(filtered, { onConflict: 'id' });
  if (error) throw new Error(`saveOrgInfo: ${error.message}`);
}

// ======== Activities ========

export async function fetchActivities(): Promise<ActivityRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localActivities();
  const { data, error } = await supabase.from('activities').select('*').order('created_at', { ascending: false });
  if (error || !data?.length) return localActivities();
  return data as ActivityRow[];
}

export async function createActivity(data: Omit<ActivityRow, 'id' | 'created_at'>): Promise<ActivityRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `act_local_${Date.now()}`, created_at: new Date().toISOString(), ...data } as ActivityRow;
  const filtered = filterColumns('activities', data as Record<string, unknown>);
  const { data: result, error } = await supabase.from('activities').insert(filtered).select().single();
  if (error) throw new Error(`createActivity: ${error.message}`);
  return result as ActivityRow;
}

// ======== Notes ========

export async function fetchNotes(): Promise<NoteRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localNotes();
  const { data, error } = await supabase.from('notes').select('*').order('pinned', { ascending: false }).order('updated_at', { ascending: false });
  if (error || !data?.length) return localNotes();
  return data as NoteRow[];
}

export async function createNote(data: Omit<NoteRow, 'id' | 'created_at' | 'updated_at'>): Promise<NoteRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `note_local_${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...data } as NoteRow;
  const filtered = filterColumns('notes', data as Record<string, unknown>);
  const { data: result, error } = await supabase.from('notes').insert(filtered).select().single();
  if (error) throw new Error(`createNote: ${error.message}`);
  return result as NoteRow;
}

export async function updateNote(id: string, data: Partial<Omit<NoteRow, 'id' | 'created_at'>>): Promise<NoteRow> {
  if (!isSupabaseConfigured() || !supabase) return { id, updated_at: new Date().toISOString(), ...data } as NoteRow;
  const filtered = filterColumns('notes', data as Record<string, unknown>);
  const { data: result, error } = await supabase.from('notes').update(filtered).eq('id', id).select().single();
  if (error) throw new Error(`updateNote: ${error.message}`);
  return result as NoteRow;
}

export async function deleteNote(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) throw new Error(`deleteNote: ${error.message}`);
}

// ======== Channel Members ========

export interface ChannelMemberRow {
  id: string;
  channel_id: string;
  member_id: string;
  role: 'creator' | 'admin' | 'member';
  joined_at: string;
}

export async function fetchChannelMembers(channelId: string): Promise<ChannelMemberRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase
    .from('channel_members')
    .select('*')
    .eq('channel_id', channelId)
    .order('joined_at', { ascending: true });
  if (error || !data) return [];
  return data as ChannelMemberRow[];
}

export async function addChannelMember(channelId: string, memberId: string, role: 'admin' | 'member' = 'member'): Promise<ChannelMemberRow | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  // Check for duplicate
  const { data: existing } = await supabase
    .from('channel_members')
    .select('id')
    .eq('channel_id', channelId)
    .eq('member_id', memberId)
    .maybeSingle();
  if (existing) {
    throw new Error('该成员已在频道中');
  }
  const { data: result, error } = await supabase
    .from('channel_members')
    .insert({ channel_id: channelId, member_id: memberId, role })
    .select()
    .single();
  if (error) throw new Error(`addChannelMember: ${error.message}`);
  return result as ChannelMemberRow;
}

export async function removeChannelMember(channelId: string, memberId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase
    .from('channel_members')
    .delete()
    .eq('channel_id', channelId)
    .eq('member_id', memberId);
  if (error) throw new Error(`removeChannelMember: ${error.message}`);
}
