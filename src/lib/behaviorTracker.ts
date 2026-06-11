/**
 * Behavior Event Tracker — lightweight client-side event tracking.
 *
 * Captures user interactions (task_create, goal_update, ai_chat, etc.)
 * and persists them to the `behavior_events` Supabase table.
 *
 * Design:
 * - DR-51: Tracking supports toggle (enabled param)
 * - DR-52: Falls back to localStorage if Supabase unavailable
 * - DR-53: Event data feeds into weekly report and risk engine
 * - Batched writes: accumulates events and flushes every 5s or on page unload
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { UsageEventRow } from '@/lib/dataLayer/types';

// ─── Types ───

export type BehaviorEventType =
  | 'task_create' | 'task_update' | 'task_complete' | 'task_delete'
  | 'goal_create' | 'goal_update' | 'goal_complete'
  | 'ai_chat' | 'ai_tool_call'
  | 'risk_create' | 'risk_resolve'
  | 'action_item_create' | 'action_item_complete'
  | 'report_generate' | 'report_export'
  | 'page_view' | 'module_switch'
  | 'login' | 'logout';

export interface BehaviorEvent {
  event_type: BehaviorEventType;
  detail: Record<string, unknown>;
  timestamp: string;
  user_id?: string | null;
  team_id?: string | null;
}

// ─── Config ───

let trackingEnabled = true;
let flushInterval: ReturnType<typeof setInterval> | null = null;
let eventQueue: BehaviorEvent[] = [];
const FLUSH_INTERVAL_MS = 5000;
const MAX_QUEUE_SIZE = 50;

// ─── Core ───

export function setTrackingEnabled(enabled: boolean): void {
  trackingEnabled = enabled;
  if (!enabled && flushInterval) {
    clearInterval(flushInterval);
    flushInterval = null;
    flush(); // flush remaining
  }
  if (enabled && !flushInterval) {
    startFlushTimer();
  }
}

export function isTrackingEnabled(): boolean {
  return trackingEnabled;
}

function startFlushTimer(): void {
  if (flushInterval) return;
  flushInterval = setInterval(flush, FLUSH_INTERVAL_MS);
  // Flush on page unload
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', flush);
  }
}

function flush(): void {
  if (eventQueue.length === 0) return;
  const batch = eventQueue.splice(0, eventQueue.length);
  persistBatch(batch);
}

async function persistBatch(events: BehaviorEvent[]): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    // Fallback: store in localStorage
    try {
      const stored = JSON.parse(localStorage.getItem('tbh_behavior_events') ?? '[]');
      const merged = [...stored, ...events].slice(-200); // Cap at 200
      localStorage.setItem('tbh_behavior_events', JSON.stringify(merged));
    } catch { /* silently ignore */ }
    return;
  }

  const rows = events.map((e) => ({
    user_id: e.user_id,
    event_type: e.event_type,
    detail: e.detail,
    created_at: e.timestamp,
  }));

  try {
    await supabase.from('behavior_events').insert(rows);
  } catch (err) {
    // Fallback to localStorage on DB error
    console.warn('[behaviorTracker] DB write failed, falling back to localStorage', err);
    try {
      const stored = JSON.parse(localStorage.getItem('tbh_behavior_events') ?? '[]');
      const merged = [...stored, ...events].slice(-200);
      localStorage.setItem('tbh_behavior_events', JSON.stringify(merged));
    } catch { /* silently ignore */ }
  }
}

// ─── Public API ───

export function trackEvent(
  eventType: BehaviorEventType,
  detail: Record<string, unknown> = {},
  userId?: string | null,
  teamId?: string | null,
): void {
  if (!trackingEnabled) return;

  const event: BehaviorEvent = {
    event_type: eventType,
    detail,
    timestamp: new Date().toISOString(),
    user_id: userId ?? null,
    team_id: teamId ?? null,
  };

  eventQueue.push(event);

  // Flush immediately if queue is full
  if (eventQueue.length >= MAX_QUEUE_SIZE) {
    flush();
  }
}

// ─── Read stored events ───

export async function fetchBehaviorEvents(limit = 100): Promise<BehaviorEvent[]> {
  // Try Supabase first
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('behavior_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (!error && data) {
        return (data as unknown as Array<{ event_type: string; detail: Record<string, unknown>; created_at: string; user_id: string | null }>).map((row) => ({
          event_type: row.event_type as BehaviorEventType,
          detail: row.detail ?? {},
          timestamp: row.created_at,
          user_id: row.user_id,
        }));
      }
    } catch { /* fallback */ }
  }

  // Fallback: localStorage
  try {
    const stored = JSON.parse(localStorage.getItem('tbh_behavior_events') ?? '[]');
    return stored.slice(-limit).reverse();
  } catch {
    return [];
  }
}

// ─── Aggregate for reporting ───

export interface BehaviorSummary {
  totalEvents: number;
  byType: Record<string, number>;
  byDay: Record<string, number>;
  topActions: Array<{ action: string; count: number }>;
  lastActiveAt: string | null;
}

export function summarizeEvents(events: BehaviorEvent[]): BehaviorSummary {
  const byType: Record<string, number> = {};
  const byDay: Record<string, number> = {};
  let lastActiveAt: string | null = null;

  for (const e of events) {
    byType[e.event_type] = (byType[e.event_type] ?? 0) + 1;
    const day = e.timestamp.slice(0, 10);
    byDay[day] = (byDay[day] ?? 0) + 1;
    if (!lastActiveAt || e.timestamp > lastActiveAt) lastActiveAt = e.timestamp;
  }

  const topActions = Object.entries(byType)
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalEvents: events.length,
    byType,
    byDay,
    topActions,
    lastActiveAt,
  };
}

// ─── Auto-start ───

if (typeof window !== 'undefined') {
  startFlushTimer();
}
