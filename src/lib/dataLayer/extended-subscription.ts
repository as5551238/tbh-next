import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { SubscriptionRow } from './types';
import { filterColumns } from './columns';

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
