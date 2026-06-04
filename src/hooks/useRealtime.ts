import { useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Subscribe to Supabase Realtime changes on a table.
 * Calls callback on INSERT/UPDATE/DELETE events.
 * Auto-cleans up on unmount.
 */
export function useRealtime(
  table: string,
  callback: (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => void,
  filters?: { column: string; value: string },
) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;

    let channel = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          ...(filters ? { filter: `${filters.column}=eq.${filters.value}` } : {}),
        },
        (payload) => {
          callback({
            eventType: payload.eventType,
            new: (payload.new ?? {}) as Record<string, unknown>,
            old: (payload.old ?? {}) as Record<string, unknown>,
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, callback, filters]);
}

/**
 * Subscribe to presence (who's online).
 */
export function usePresence(
  room: string,
  userId: string,
  onSync?: (states: Record<string, { user: string; online_at: string }>) => void,
) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;

    const channel = supabase.channel(room, {
      config: { presence: { key: userId } },
    });

    if (onSync) {
      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ user: string; online_at: string }>();
        onSync(state as Record<string, { user: string; online_at: string }>);
      });
    }

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user: userId, online_at: new Date().toISOString() });
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [room, userId, onSync]);
}
