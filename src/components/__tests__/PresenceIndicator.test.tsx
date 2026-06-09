import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PresenceIndicator } from '../PresenceIndicator';
import type { OnlineUser } from '@/hooks/usePresenceStatus';

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: vi.fn(),
  supabase: null,
}));

vi.mock('@/hooks/usePresenceStatus', () => ({
  usePresenceStatus: vi.fn(),
}));

vi.mock('@/hooks/useRealtime', () => ({
  usePresence: vi.fn(),
}));

import { usePresenceStatus } from '@/hooks/usePresenceStatus';
import { isSupabaseConfigured } from '@/lib/supabase';

describe('PresenceIndicator', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => cleanup());

  it('renders "1人在线" in demo mode', () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    vi.mocked(usePresenceStatus).mockReturnValue({
      onlineUsers: [{ id: 'u1', name: '我', onlineAt: new Date().toISOString() }],
      onlineCount: 1,
      isOnline: false,
    });
    render(<PresenceIndicator userId="user1" />);
    expect(screen.getByText('1人在线')).toBeInTheDocument();
  });

  it('renders online user avatars when present', () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    const users: OnlineUser[] = [
      { id: 'u1', name: 'Alice', onlineAt: '2026-01-01T00:00:00Z' },
      { id: 'u2', name: 'Bob', onlineAt: '2026-01-01T00:01:00Z' },
    ];
    vi.mocked(usePresenceStatus).mockReturnValue({
      onlineUsers: users, onlineCount: 2, isOnline: true,
    });
    render(<PresenceIndicator userId="u1" />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('returns null when onlineCount is 0 and Supabase configured', () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(usePresenceStatus).mockReturnValue({
      onlineUsers: [], onlineCount: 0, isOnline: false,
    });
    const { container } = render(<PresenceIndicator userId="user1" />);
    expect(container.innerHTML).toBe('');
  });

  it('shows overflow when more than 5 users online', () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    const users: OnlineUser[] = Array.from({ length: 7 }, (_, i) => ({
      id: `u${i}`, name: `User${i}`, onlineAt: `2026-01-01T00:0${i}:00Z`,
    }));
    vi.mocked(usePresenceStatus).mockReturnValue({
      onlineUsers: users, onlineCount: 7, isOnline: true,
    });
    render(<PresenceIndicator userId="u0" />);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('shows tooltip with names on hover', () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    const users: OnlineUser[] = [
      { id: 'u1', name: 'Alice', onlineAt: '2026-01-01T00:00:00Z' },
    ];
    vi.mocked(usePresenceStatus).mockReturnValue({
      onlineUsers: users, onlineCount: 1, isOnline: true,
    });
    render(<PresenceIndicator userId="u1" />);
    const wrapper = screen.getByText('A').closest('.relative')!;
    fireEvent.mouseEnter(wrapper);
    expect(screen.getByText(/1人在线/)).toBeInTheDocument();
  });
});
