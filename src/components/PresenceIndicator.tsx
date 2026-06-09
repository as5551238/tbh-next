import { useState } from 'react';
import { usePresenceStatus } from '@/hooks/usePresenceStatus';
import { isSupabaseConfigured } from '@/lib/supabase';

const MAX_VISIBLE = 5;
const AVATAR_COLORS = [
  'from-blue-500 to-cyan-400',
  'from-purple-500 to-pink-400',
  'from-green-500 to-emerald-400',
  'from-orange-500 to-yellow-400',
  'from-rose-500 to-red-400',
];

export function PresenceIndicator({ userId }: { userId: string }) {
  const { onlineUsers, onlineCount } = usePresenceStatus(userId);
  const [hovered, setHovered] = useState(false);

  if (!isSupabaseConfigured()) {
    return (
      <div className="flex items-center justify-center py-1">
        <span className="text-[10px] text-text-3">1人在线</span>
      </div>
    );
  }

  if (onlineCount === 0) return null;

  const visible = onlineUsers.slice(0, MAX_VISIBLE);
  const overflow = onlineCount - MAX_VISIBLE;
  const names = onlineUsers.map((u) => u.name).join(', ');

  return (
    <div
      className="relative flex flex-col items-center py-1"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex -space-x-1.5">
        {visible.map((user, i) => (
          <div
            key={user.id}
            className={`relative flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} text-[8px] font-bold text-white ring-1 ring-surface`}
            style={{ zIndex: visible.length - i }}
          >
            {user.name.charAt(0).toUpperCase()}
            <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-green-400 ring-1 ring-surface" />
          </div>
        ))}
        {overflow > 0 && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-2 text-[8px] font-medium text-text-3 ring-1 ring-surface">
            {'+'}{overflow}
          </div>
        )}
      </div>
      {hovered && (
        <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-surface-3 px-3 py-1.5 text-xs text-text shadow-lg">
          {onlineCount}人在线: {names}
        </div>
      )}
    </div>
  );
}
