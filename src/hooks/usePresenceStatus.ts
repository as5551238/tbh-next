import { useState, useCallback } from 'react';
import { usePresence } from './useRealtime';
import { isSupabaseConfigured } from '@/lib/supabase';

export interface OnlineUser {
  id: string;
  name: string;
  onlineAt: string;
}

export function usePresenceStatus(userId: string, room = 'global') {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  const onSync = useCallback(
    (states: Record<string, { user: string; online_at: string }>) => {
      const users: OnlineUser[] = [];
      for (const [key, presence] of Object.entries(states)) {
        if (presence) {
          users.push({
            id: key,
            name: presence.user || key,
            onlineAt: presence.online_at,
          });
        }
      }
      users.sort((a, b) => a.onlineAt.localeCompare(b.onlineAt));
      setOnlineUsers(users);
    },
    [],
  );

  const configured = isSupabaseConfigured();

  usePresence(configured ? room : '', configured ? userId : '', configured ? onSync : undefined);

  const isOnline = configured ? onlineUsers.some((u) => u.id === userId) : false;

  const finalUsers = configured ? onlineUsers : [{ id: userId, name: '我', onlineAt: new Date().toISOString() }];

  return {
    onlineUsers: finalUsers,
    onlineCount: finalUsers.length,
    isOnline,
  };
}
