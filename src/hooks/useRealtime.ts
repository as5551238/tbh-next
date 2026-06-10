import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAppStore } from '@/stores/appStore';
import type { RealtimeChannel } from '@supabase/supabase-js';

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_BASE_DELAY = 2000;
const POLL_INTERVAL = 30000; // 30s fallback polling when Realtime fails

export type RealtimeStatus = 'connected' | 'reconnecting' | 'degraded' | 'disconnected';

export function useRealtimeHealth() {
  return useRef<{ table: string; status: RealtimeStatus; lastEvent: string; attempts: number }[]>([]);
}

export function useRealtime(
  table: string,
  callback: (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => void,
  filters?: { column: string; value: string },
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const [status, setStatus] = useState<RealtimeStatus>('disconnected');

  // Sync status to global store for UI indicator
  const setRealtimeStatus = useAppStore((s) => s.setRealtimeStatus);
  useEffect(() => { setRealtimeStatus(status); }, [status, setRealtimeStatus]);

  // Fallback: when Realtime fails after MAX_RECONNECT, degrade to periodic refetch
  const startPolling = useCallback(() => {
    setStatus('degraded');
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(() => {
      // Trigger a synthetic refresh event so consumers refetch
      callbackRef.current({
        eventType: 'REFETCH',
        new: { _table: table, _reason: 'polling_fallback' },
        old: {},
      });
    }, POLL_INTERVAL);
  }, [table]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
  }, []);

  const subscribeWithReconnect = useCallback((ch: RealtimeChannel) => {
    ch.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        ...(filters ? { filter: `${filters.column}=eq.${filters.value}` } : {}),
      },
      (payload) => {
        setStatus('connected');
        callbackRef.current({
          eventType: payload.eventType,
          new: (payload.new ?? {}) as Record<string, unknown>,
          old: (payload.old ?? {}) as Record<string, unknown>,
        });
      }
    ).subscribe((statusVal, err) => {
      if (statusVal === 'SUBSCRIBED') {
        reconnectAttemptRef.current = 0;
        setStatus('connected');
        stopPolling();
      }
      if (statusVal === 'CHANNEL_ERROR' || statusVal === 'TIMED_OUT') {
        console.warn(`[useRealtime] ${table} status=${statusVal}`, err);
        if (reconnectAttemptRef.current < MAX_RECONNECT_ATTEMPTS) {
          setStatus('reconnecting');
          const delay = RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttemptRef.current);
          reconnectAttemptRef.current++;
          console.warn(`[useRealtime] ${table} reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current})`);
          if (channelRef.current) { supabase!.removeChannel(channelRef.current); }
          reconnectTimerRef.current = setTimeout(() => {
            if (!isSupabaseConfigured() || !supabase) { startPolling(); return; }
            const newChannel = supabase!.channel(`${table}-changes-retry-${reconnectAttemptRef.current}`);
            channelRef.current = newChannel;
            subscribeWithReconnect(newChannel);
          }, delay);
        } else {
          console.error(`[useRealtime] ${table} max reconnect reached, degrading to polling`);
          startPolling();
        }
      }
    });
  }, [table, filters, startPolling, stopPolling]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) { startPolling(); return; }
    const channel = supabase!.channel(`${table}-changes`);
    channelRef.current = channel;
    reconnectAttemptRef.current = 0;
    subscribeWithReconnect(channel);
    return () => {
      if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
      if (channelRef.current) { supabase!.removeChannel(channelRef.current); channelRef.current = null; }
      stopPolling();
    };
  }, [table, subscribeWithReconnect, startPolling, stopPolling]);

  return status;
}

export function usePresence(
  room: string,
  userId: string,
  onSync?: (states: Record<string, { user: string; online_at: string }>) => void,
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;
  const reconnectRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;
    const channel = supabase!.channel(room, { config: { presence: { key: userId } } });
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<{ user: string; online_at: string }>();
      onSyncRef.current?.(state as unknown as Record<string, { user: string; online_at: string }>);
    });
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        reconnectRef.current = 0;
        await channel.track({ user: userId, online_at: new Date().toISOString() });
      }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn(`[usePresence] ${room} status=${status}`);
        if (reconnectRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectRef.current++;
          const delay = RECONNECT_BASE_DELAY * Math.pow(2, reconnectRef.current - 1);
          timerRef.current = setTimeout(() => {
            supabase!.removeChannel(channel);
            const newCh = supabase!.channel(`${room}-retry-${reconnectRef.current}`, { config: { presence: { key: userId } } });
            channelRef.current = newCh;
            newCh.on('presence', { event: 'sync' }, () => {
              const state = newCh.presenceState<{ user: string; online_at: string }>();
              onSyncRef.current?.(state as unknown as Record<string, { user: string; online_at: string }>);
            });
            newCh.subscribe(async (s) => {
              if (s === 'SUBSCRIBED') { reconnectRef.current = 0; await newCh.track({ user: userId, online_at: new Date().toISOString() }); }
            });
          }, delay);
        }
      }
    });
    channelRef.current = channel;
    return () => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      if (channelRef.current) { channelRef.current.untrack(); supabase!.removeChannel(channelRef.current); channelRef.current = null; }
    };
  }, [room, userId]);
}
