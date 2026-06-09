import { useEffect, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_BASE_DELAY = 2000;

export function useRealtime(
  table: string,
  callback: (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => void,
  filters?: { column: string; value: string },
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

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
        callbackRef.current({
          eventType: payload.eventType,
          new: (payload.new ?? {}) as Record<string, unknown>,
          old: (payload.old ?? {}) as Record<string, unknown>,
        });
      }
    ).subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        reconnectAttemptRef.current = 0;
      }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn(`[useRealtime] ${table} status=${status}`, err);
        if (reconnectAttemptRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttemptRef.current);
          reconnectAttemptRef.current++;
          console.warn(`[useRealtime] ${table} reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current})`);
          if (channelRef.current) { supabase.removeChannel(channelRef.current); }
          reconnectTimerRef.current = setTimeout(() => {
            if (!isSupabaseConfigured() || !supabase) return;
            const newChannel = supabase!.channel(`${table}-changes-retry-${reconnectAttemptRef.current}`);
            channelRef.current = newChannel;
            subscribeWithReconnect(newChannel);
          }, delay);
        } else {
          console.error(`[useRealtime] ${table} max reconnect attempts reached`);
        }
      }
    });
  }, [table, filters]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;
    const channel = supabase!.channel(`${table}-changes`);
    channelRef.current = channel;
    reconnectAttemptRef.current = 0;
    subscribeWithReconnect(channel);
    return () => {
      if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    };
  }, [table, subscribeWithReconnect]);
}

export function usePresence(
  room: string,
  userId: string,
  onSync?: (states: Record<string, { user: string; online_at: string }>) => void,
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;
    const channel = supabase!.channel(room, { config: { presence: { key: userId } } });
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<{ user: string; online_at: string }>();
      onSyncRef.current?.(state as Record<string, { user: string; online_at: string }>);
    });
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') { await channel.track({ user: userId, online_at: new Date().toISOString() }); }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { console.warn(`[usePresence] ${room} status=${status}`); }
    });
    channelRef.current = channel;
    return () => {
      if (channelRef.current) { channelRef.current.untrack(); supabase.removeChannel(channelRef.current); channelRef.current = null; }
    };
  }, [room, userId]);
}
