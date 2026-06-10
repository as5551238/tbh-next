import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type {
  InsightInput, InsightUpdate,
  WorkflowInstanceInput, WorkflowInstanceUpdate,
  OrgInfoUpdate,
} from '@/contracts/dataContracts';
import type {
  OrgInfoRow,
  ActivityRow, NoteRow, SprintRow, TemplateRow, BookmarkRow,
  CommentRow, TagRow, CategoryRow, FeatureFlagRow, SavedViewRow,
  AutomationRuleRow, StatusFlowRuleRow, ItemLinkRow,
} from '@/lib/dataLayerMockData';
import {
  localActivities, localNotes, localSprints, localTemplates, localBookmarks,
  localComments, localTags, localCategories, localFeatureFlags, localSavedViews,
  localAutomationRules, localStatusFlowRules, localItemLinks,
} from '@/lib/dataLayerMockData';
import type {
  AuditLogRow, SubscriptionRow, UsageEventRow,
  InsightRow, WorkflowInstanceRow, ChannelRow, MessageRow,
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

// ======== Sprints ========

export async function fetchSprints(): Promise<SprintRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localSprints();
  const { data, error } = await supabase.from('sprints').select('*').order('start_date', { ascending: false });
  if (error || !data?.length) return localSprints();
  return data as SprintRow[];
}

export async function createSprint(data: Omit<SprintRow, 'id' | 'created_at' | 'updated_at'>): Promise<SprintRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `sp_local_${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...data } as SprintRow;
  const filtered = filterColumns('sprints', data as Record<string, unknown>);
  const { data: result, error } = await supabase.from('sprints').insert(filtered).select().single();
  if (error) throw new Error(`createSprint: ${error.message}`);
  return result as SprintRow;
}

export async function updateSprint(id: string, data: Partial<Omit<SprintRow, 'id' | 'created_at'>>): Promise<SprintRow> {
  if (!isSupabaseConfigured() || !supabase) return { id, updated_at: new Date().toISOString(), ...data } as SprintRow;
  const filtered = filterColumns('sprints', data as Record<string, unknown>);
  const { data: result, error } = await supabase.from('sprints').update(filtered).eq('id', id).select().single();
  if (error) throw new Error(`updateSprint: ${error.message}`);
  return result as SprintRow;
}

export async function deleteSprint(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('sprints').delete().eq('id', id);
  if (error) throw new Error(`deleteSprint: ${error.message}`);
}

// ======== Templates ========

export async function fetchTemplates(): Promise<TemplateRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localTemplates();
  const { data, error } = await supabase.from('templates').select('*').order('usage_count', { ascending: false });
  if (error || !data?.length) return localTemplates();
  return data as TemplateRow[];
}

export async function createTemplate(data: Omit<TemplateRow, 'id' | 'created_at' | 'updated_at'>): Promise<TemplateRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `tpl_local_${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...data } as TemplateRow;
  const filtered = filterColumns('templates', data as Record<string, unknown>);
  const { data: result, error } = await supabase.from('templates').insert(filtered).select().single();
  if (error) throw new Error(`createTemplate: ${error.message}`);
  return result as TemplateRow;
}

export async function updateTemplate(id: string, data: Partial<Omit<TemplateRow, 'id' | 'created_at'>>): Promise<TemplateRow> {
  if (!isSupabaseConfigured() || !supabase) return { id, updated_at: new Date().toISOString(), ...data } as TemplateRow;
  const filtered = filterColumns('templates', data as Record<string, unknown>);
  const { data: result, error } = await supabase.from('templates').update(filtered).eq('id', id).select().single();
  if (error) throw new Error(`updateTemplate: ${error.message}`);
  return result as TemplateRow;
}

export async function deleteTemplate(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('templates').delete().eq('id', id);
  if (error) throw new Error(`deleteTemplate: ${error.message}`);
}

// ======== Bookmarks ========

export async function fetchBookmarks(): Promise<BookmarkRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localBookmarks();
  const { data, error } = await supabase.from('bookmarks').select('*').order('created_at', { ascending: false });
  if (error || !data?.length) return localBookmarks();
  return data as BookmarkRow[];
}

export async function createBookmark(data: Omit<BookmarkRow, 'id' | 'created_at'>): Promise<BookmarkRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `bk_local_${Date.now()}`, created_at: new Date().toISOString(), ...data } as BookmarkRow;
  const filtered = filterColumns('bookmarks', data as Record<string, unknown>);
  const { data: result, error } = await supabase.from('bookmarks').insert(filtered).select().single();
  if (error) throw new Error(`createBookmark: ${error.message}`);
  return result as BookmarkRow;
}

export async function deleteBookmark(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('bookmarks').delete().eq('id', id);
  if (error) throw new Error(`deleteBookmark: ${error.message}`);
}

// ======== Comments ========

export async function fetchComments(targetType?: string, targetId?: string): Promise<CommentRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localComments(targetType, targetId);
  let query = supabase.from('comments').select('*').order('created_at', { ascending: true });
  if (targetType) query = query.eq('target_type', targetType);
  if (targetId) query = query.eq('target_id', targetId);
  const { data, error } = await query;
  if (error || !data?.length) return localComments(targetType, targetId);
  return data as CommentRow[];
}

export async function createComment(data: Omit<CommentRow, 'id' | 'created_at' | 'updated_at'>): Promise<CommentRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `cmt_local_${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...data } as CommentRow;
  const filtered = filterColumns('comments', data as Record<string, unknown>);
  const { data: result, error } = await supabase.from('comments').insert(filtered).select().single();
  if (error) throw new Error(`createComment: ${error.message}`);
  return result as CommentRow;
}

export async function deleteComment(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('comments').delete().eq('id', id);
  if (error) throw new Error(`deleteComment: ${error.message}`);
}

// ======== Tags ========

export async function fetchTags(): Promise<TagRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localTags();
  const { data, error } = await supabase.from('tags').select('*').order('name');
  if (error || !data?.length) return localTags();
  return data as TagRow[];
}

export async function createTag(data: Omit<TagRow, 'id' | 'created_at' | 'updated_at'>): Promise<TagRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `tag_local_${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...data } as TagRow;
  const filtered = filterColumns('tags', data as Record<string, unknown>);
  const { data: result, error } = await supabase.from('tags').insert(filtered).select().single();
  if (error) throw new Error(`createTag: ${error.message}`);
  return result as TagRow;
}

export async function deleteTag(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('tags').delete().eq('id', id);
  if (error) throw new Error(`deleteTag: ${error.message}`);
}

// ======== Categories ========

export async function fetchCategories(): Promise<CategoryRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localCategories();
  const { data, error } = await supabase.from('categories').select('*').order('sort_order');
  if (error || !data?.length) return localCategories();
  return data as CategoryRow[];
}

export async function createCategory(data: Omit<CategoryRow, 'id' | 'created_at' | 'updated_at'>): Promise<CategoryRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `cat_local_${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...data } as CategoryRow;
  const filtered = filterColumns('categories', data as Record<string, unknown>);
  const { data: result, error } = await supabase.from('categories').insert(filtered).select().single();
  if (error) throw new Error(`createCategory: ${error.message}`);
  return result as CategoryRow;
}

export async function deleteCategory(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw new Error(`deleteCategory: ${error.message}`);
}

// ======== Feature Flags ========

export async function fetchFeatureFlags(): Promise<FeatureFlagRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localFeatureFlags();
  const { data, error } = await supabase.from('feature_flags').select('*').order('name');
  if (error || !data?.length) return localFeatureFlags();
  return data as FeatureFlagRow[];
}

export async function updateFeatureFlag(id: string, updates: Partial<FeatureFlagRow>): Promise<FeatureFlagRow> {
  if (!isSupabaseConfigured() || !supabase) return { id, ...updates, updated_at: new Date().toISOString() } as FeatureFlagRow;
  const filtered = filterColumns('feature_flags', updates as Record<string, unknown>);
  const { data, error } = await supabase.from('feature_flags').update(filtered).eq('id', id).select().single();
  if (error) throw new Error(`updateFeatureFlag: ${error.message}`);
  return data as FeatureFlagRow;
}

// ======== Saved Views ========

export async function fetchSavedViews(): Promise<SavedViewRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localSavedViews();
  const { data, error } = await supabase.from('saved_views').select('*').order('name');
  if (error || !data?.length) return localSavedViews();
  return data as SavedViewRow[];
}

export async function createSavedView(data: Omit<SavedViewRow, 'id' | 'created_at' | 'updated_at'>): Promise<SavedViewRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `sv_local_${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...data } as SavedViewRow;
  const filtered = filterColumns('saved_views', data as Record<string, unknown>);
  const { data: result, error } = await supabase.from('saved_views').insert(filtered).select().single();
  if (error) throw new Error(`createSavedView: ${error.message}`);
  return result as SavedViewRow;
}

export async function deleteSavedView(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('saved_views').delete().eq('id', id);
  if (error) throw new Error(`deleteSavedView: ${error.message}`);
}

// ======== Automation Rules ========

export async function fetchAutomationRules(): Promise<AutomationRuleRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localAutomationRules();
  const { data, error } = await supabase.from('automation_rules').select('*').order('priority', { ascending: false });
  if (error || !data?.length) return localAutomationRules();
  return data as AutomationRuleRow[];
}

export async function createAutomationRule(data: Omit<AutomationRuleRow, 'id' | 'created_at' | 'updated_at'>): Promise<AutomationRuleRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `ar_local_${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...data } as AutomationRuleRow;
  const filtered = filterColumns('automation_rules', data as Record<string, unknown>);
  const { data: result, error } = await supabase.from('automation_rules').insert(filtered).select().single();
  if (error) throw new Error(`createAutomationRule: ${error.message}`);
  return result as AutomationRuleRow;
}

export async function updateAutomationRule(id: string, updates: Partial<AutomationRuleRow>): Promise<AutomationRuleRow> {
  if (!isSupabaseConfigured() || !supabase) return { id, ...updates, updated_at: new Date().toISOString() } as AutomationRuleRow;
  const filtered = filterColumns('automation_rules', updates as Record<string, unknown>);
  const { data, error } = await supabase.from('automation_rules').update(filtered).eq('id', id).select().single();
  if (error) throw new Error(`updateAutomationRule: ${error.message}`);
  return data as AutomationRuleRow;
}

export async function deleteAutomationRule(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('automation_rules').delete().eq('id', id);
  if (error) throw new Error(`deleteAutomationRule: ${error.message}`);
}

// ======== Status Flow Rules ========

export async function fetchStatusFlowRules(): Promise<StatusFlowRuleRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localStatusFlowRules();
  const { data, error } = await supabase.from('status_flow_rules').select('*').order('entity_type', { ascending: true });
  if (error || !data?.length) return localStatusFlowRules();
  return data as StatusFlowRuleRow[];
}

export async function createStatusFlowRule(data: Omit<StatusFlowRuleRow, 'id' | 'created_at' | 'updated_at'>): Promise<StatusFlowRuleRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `sfr_local_${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...data } as StatusFlowRuleRow;
  const filtered = filterColumns('status_flow_rules', data as Record<string, unknown>);
  const { data: result, error } = await supabase.from('status_flow_rules').insert(filtered).select().single();
  if (error) throw new Error(`createStatusFlowRule: ${error.message}`);
  return result as StatusFlowRuleRow;
}

export async function deleteStatusFlowRule(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('status_flow_rules').delete().eq('id', id);
  if (error) throw new Error(`deleteStatusFlowRule: ${error.message}`);
}

// ======== Item Links ========

export async function fetchItemLinks(sourceId?: string, sourceType?: string): Promise<ItemLinkRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localItemLinks(sourceId, sourceType);
  let query = supabase.from('item_links').select('*').order('created_at', { ascending: true });
  if (sourceId) query = query.eq('source_id', sourceId);
  if (sourceType) query = query.eq('source_type', sourceType);
  const { data, error } = await query;
  if (error || !data?.length) return localItemLinks(sourceId, sourceType);
  return data as ItemLinkRow[];
}

export async function createItemLink(data: Omit<ItemLinkRow, 'id' | 'created_at'>): Promise<ItemLinkRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `il_local_${Date.now()}`, created_at: new Date().toISOString(), ...data } as ItemLinkRow;
  const filtered = filterColumns('item_links', data as Record<string, unknown>);
  const { data: result, error } = await supabase.from('item_links').insert(filtered).select().single();
  if (error) throw new Error(`createItemLink: ${error.message}`);
  return result as ItemLinkRow;
}

export async function deleteItemLink(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('item_links').delete().eq('id', id);
  if (error) throw new Error(`deleteItemLink: ${error.message}`);
}

// ======== Audit Logs ========

export async function fetchAuditLogs(
  teamId: string,
  filters?: { table?: string; action?: string },
  page = 0,
  pageSize = 20,
): Promise<{ data: AuditLogRow[]; hasMore: boolean }> {
  if (!isSupabaseConfigured() || !supabase) return { data: [], hasMore: false };
  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);
  if (filters?.table) query = query.eq('table_name', filters.table);
  if (filters?.action) query = query.eq('action', filters.action);
  const { data, error } = await query;
  if (error || !data) return { data: [], hasMore: false };
  return { data: data as AuditLogRow[], hasMore: data.length === pageSize };
}

// ======== Subscriptions ========

export async function fetchSubscriptionByUserId(userId: string): Promise<SubscriptionRow | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error || !data) return null;
  return data as SubscriptionRow;
}

export async function createSubscription(data: Omit<SubscriptionRow, 'id' | 'created_at' | 'updated_at'>): Promise<SubscriptionRow> {
  if (!isSupabaseConfigured() || !supabase) return {} as SubscriptionRow;
  const filtered = filterColumns('subscriptions', data as Record<string, unknown>);
  const { data: result, error } = await supabase.from('subscriptions').insert(filtered).select().single();
  if (error) throw new Error(`createSubscription: ${error.message}`);
  return result as SubscriptionRow;
}

export async function upsertSubscription(data: Record<string, unknown>): Promise<SubscriptionRow> {
  if (!isSupabaseConfigured() || !supabase) return {} as SubscriptionRow;
  const filtered = filterColumns('subscriptions', data);
  const { data: result, error } = await supabase
    .from('subscriptions')
    .upsert(filtered, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) throw new Error(`upsertSubscription: ${error.message}`);
  return result as SubscriptionRow;
}

export async function updateSubscription(id: string, data: Partial<SubscriptionRow>): Promise<SubscriptionRow> {
  if (!isSupabaseConfigured() || !supabase) return {} as SubscriptionRow;
  const filtered = filterColumns('subscriptions', data as Record<string, unknown>);
  const { data: result, error } = await supabase.from('subscriptions').update(filtered).eq('id', id).select().single();
  if (error) throw new Error(`updateSubscription: ${error.message}`);
  return result as SubscriptionRow;
}

// ======== Usage Events ========

export async function recordUsageEvent(data: { user_id: string; event_type: string; detail?: Record<string, unknown> }): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const filtered = filterColumns('usage_events', { ...data, detail: data.detail ?? {} });
  const { error } = await supabase.from('usage_events').insert(filtered);
  if (error) throw new Error(`recordUsageEvent: ${error.message}`);
}

export async function fetchUsageEventCount(userId: string, eventType: string, since: string): Promise<number> {
  if (!isSupabaseConfigured() || !supabase) return 0;
  const { count, error } = await supabase
    .from('usage_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('event_type', eventType)
    .gte('created_at', since);
  if (error) return 0;
  return count ?? 0;
}

// ======== API Keys ========

export async function fetchApiKeys(): Promise<import('./types').ApiKeyRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase.from('api_keys').select('*').order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as import('./types').ApiKeyRow[];
}

export async function createApiKey(data: { provider: string; encrypted_key: string; team_id?: string }): Promise<import('./types').ApiKeyRow> {
  if (!isSupabaseConfigured() || !supabase) return {} as import('./types').ApiKeyRow;
  const filtered = filterColumns('api_keys', data as Record<string, unknown>);
  const { data: result, error } = await supabase.from('api_keys').insert(filtered).select().single();
  if (error) throw new Error(`createApiKey: ${error.message}`);
  return result as import('./types').ApiKeyRow;
}

export async function updateApiKey(id: string, data: { encrypted_key?: string }): Promise<import('./types').ApiKeyRow> {
  if (!isSupabaseConfigured() || !supabase) return {} as import('./types').ApiKeyRow;
  const filtered = filterColumns('api_keys', data as Record<string, unknown>);
  const { data: result, error } = await supabase.from('api_keys').update(filtered).eq('id', id).select().single();
  if (error) throw new Error(`updateApiKey: ${error.message}`);
  return result as import('./types').ApiKeyRow;
}

export async function deleteApiKey(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('api_keys').delete().eq('id', id);
  if (error) throw new Error(`deleteApiKey: ${error.message}`);
}

// ======== Notifications (update / delete) ========

export async function updateNotification(id: string, data: { read?: boolean }): Promise<import('./types').NotificationRow> {
  if (!isSupabaseConfigured() || !supabase) return {} as import('./types').NotificationRow;
  const filtered = filterColumns('notifications', data as Record<string, unknown>);
  const { data: result, error } = await supabase.from('notifications').update(filtered).eq('id', id).select().single();
  if (error) throw new Error(`updateNotification: ${error.message}`);
  return result as import('./types').NotificationRow;
}

export async function updateNotifications(data: { read?: boolean }, filter: { neq?: [string, unknown] }): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const filtered = filterColumns('notifications', data as Record<string, unknown>);
  let query = supabase.from('notifications').update(filtered);
  if (filter.neq) query = query.neq(filter.neq[0], filter.neq[1] as string);
  const { error } = await query;
  if (error) throw new Error(`updateNotifications: ${error.message}`);
}

export async function deleteNotification(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) throw new Error(`deleteNotification: ${error.message}`);
}

export async function deleteAllNotifications(): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('notifications').delete().neq('id', '__never__');
  if (error) throw new Error(`deleteAllNotifications: ${error.message}`);
}

// ======== Knowledge Packs ========

export async function fetchKnowledgePacks(industry?: string): Promise<import('./types').KnowledgePackRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  let query = supabase.from('knowledge_packs').select('*').order('downloads', { ascending: false });
  if (industry) query = query.eq('industry', industry);
  const { data, error } = await query;
  if (error || !data) return [];
  return data as import('./types').KnowledgePackRow[];
}

export async function createKnowledgePack(data: Record<string, unknown>): Promise<import('./types').KnowledgePackRow> {
  if (!isSupabaseConfigured() || !supabase) return {} as import('./types').KnowledgePackRow;
  const filtered = filterColumns('knowledge_packs', data);
  const { data: result, error } = await supabase.from('knowledge_packs').insert(filtered).select().single();
  if (error) throw new Error(`createKnowledgePack: ${error.message}`);
  return result as import('./types').KnowledgePackRow;
}

// ======== Marketplace Agents ========

export async function fetchMarketplaceAgents(): Promise<import('./types').MarketplaceAgentRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase.from('marketplace_agents').select('*').order('downloads', { ascending: false });
  if (error || !data) return [];
  return data as import('./types').MarketplaceAgentRow[];
}

export async function createMarketplaceAgent(data: Record<string, unknown>): Promise<import('./types').MarketplaceAgentRow> {
  if (!isSupabaseConfigured() || !supabase) return {} as import('./types').MarketplaceAgentRow;
  const filtered = filterColumns('marketplace_agents', data);
  const { data: result, error } = await supabase.from('marketplace_agents').insert(filtered).select().single();
  if (error) throw new Error(`createMarketplaceAgent: ${error.message}`);
  return result as import('./types').MarketplaceAgentRow;
}

// ======== AI Module: Agent Configs ========

export async function fetchAgentConfigs(): Promise<import('./types').AgentConfigRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase.from('agent_configs').select('*').order('sort_order', { ascending: true });
  if (error || !data) return [];
  return data as import('./types').AgentConfigRow[];
}

export async function upsertAgentConfig(data: Record<string, unknown>): Promise<import('./types').AgentConfigRow> {
  if (!isSupabaseConfigured() || !supabase) return {} as import('./types').AgentConfigRow;
  const filtered = filterColumns('agent_configs', data);
  const { data: result, error } = await supabase.from('agent_configs').upsert(filtered, { onConflict: 'name' }).select().single();
  if (error) throw new Error(`upsertAgentConfig: ${error.message}`);
  return result as import('./types').AgentConfigRow;
}

// ======== AI Module: Installed Agents ========

export async function fetchInstalledAgents(): Promise<import('./types').InstalledAgentRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase.from('installed_agents').select('*').order('installed_at', { ascending: false });
  if (error || !data) return [];
  return data as import('./types').InstalledAgentRow[];
}

export async function insertInstalledAgent(agentId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('installed_agents').insert({ agent_id: agentId, team_id: '__default__', member_id: 'demo' });
  if (error) throw new Error(`insertInstalledAgent: ${error.message}`);
}

export async function deleteInstalledAgent(agentId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('installed_agents').delete().eq('agent_id', agentId);
  if (error) throw new Error(`deleteInstalledAgent: ${error.message}`);
}

export async function replaceInstalledAgents(agentIds: string[]): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  await supabase.from('installed_agents').delete().neq('id', '__never__');
  if (agentIds.length > 0) {
    const rows = agentIds.map((aid) => ({ agent_id: aid, team_id: '__default__', member_id: 'demo' }));
    await supabase.from('installed_agents').insert(rows);
  }
}

// ======== AI Module: Running Workflows ========

export async function fetchRunningWorkflows(): Promise<import('./types').RunningWorkflowRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase.from('running_workflows').select('*');
  if (error || !data) return [];
  return data as import('./types').RunningWorkflowRow[];
}

export async function insertRunningWorkflow(workflowId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('running_workflows').insert({ workflow_id: workflowId });
  if (error && !error.message.includes('duplicate')) throw new Error(`insertRunningWorkflow: ${error.message}`);
}

export async function deleteRunningWorkflow(workflowId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('running_workflows').delete().eq('workflow_id', workflowId);
  if (error) throw new Error(`deleteRunningWorkflow: ${error.message}`);
}

export async function replaceRunningWorkflows(workflowIds: string[]): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  await supabase.from('running_workflows').delete().neq('id', '__never__');
  if (workflowIds.length > 0) {
    const rows = workflowIds.map((wid) => ({ workflow_id: wid }));
    await supabase.from('running_workflows').insert(rows);
  }
}

// ======== AI Module: MCP Status ========

export async function fetchMcpStatuses(): Promise<import('./types').McpStatusRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase.from('mcp_status').select('*');
  if (error || !data) return [];
  return data as import('./types').McpStatusRow[];
}

export async function upsertMcpStatus(serverId: string, status: Record<string, unknown>): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const filtered = filterColumns('mcp_status', { server_id: serverId, status });
  const { error } = await supabase.from('mcp_status').upsert(filtered, { onConflict: 'server_id' });
  if (error) throw new Error(`upsertMcpStatus: ${error.message}`);
}

export async function replaceMcpStatuses(statuses: Record<string, unknown>): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  await supabase.from('mcp_status').delete().neq('id', '__never__');
  for (const [serverId, status] of Object.entries(statuses)) {
    await supabase.from('mcp_status').insert({ server_id: serverId, status });
  }
}

// ======== AI Module: Installed Packs ========

export async function fetchInstalledPacks(): Promise<import('./types').InstalledPackRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase.from('installed_packs').select('*');
  if (error || !data) return [];
  return data as import('./types').InstalledPackRow[];
}

export async function insertInstalledPack(packId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('installed_packs').insert({ pack_id: packId });
  if (error && !error.message.includes('duplicate')) throw new Error(`insertInstalledPack: ${error.message}`);
}

export async function deleteInstalledPack(packId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('installed_packs').delete().eq('pack_id', packId);
  if (error) throw new Error(`deleteInstalledPack: ${error.message}`);
}

export async function replaceInstalledPacks(packIds: string[]): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  await supabase.from('installed_packs').delete().neq('id', '__never__');
  if (packIds.length > 0) {
    const rows = packIds.map((pid) => ({ pack_id: pid }));
    await supabase.from('installed_packs').insert(rows);
  }
}
