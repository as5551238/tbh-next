import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type {
  AutomationRuleRow, StatusFlowRuleRow, ItemLinkRow,
} from '@/lib/dataLayerMockData';
import {
  localAutomationRules, localStatusFlowRules, localItemLinks,
} from '@/lib/dataLayerMockData';
import type { AuditLogRow } from './types';
import { filterColumns } from './columns';

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
