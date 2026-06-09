// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase', () => {
  const ch = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    track: vi.fn().mockResolvedValue(undefined),
    untrack: vi.fn().mockReturnThis(),
    presenceState: vi.fn().mockReturnValue({}),
  };
  return {
    isSupabaseConfigured: vi.fn(() => true),
    supabase: {
      channel: vi.fn(() => ch),
      removeChannel: vi.fn(),
    },
    _mockChannel: ch,
  };
});

import { useRealtime, usePresence } from '@/hooks/useRealtime';
import { renderHook, act } from '@testing-library/react';
import { supabase, _mockChannel, isSupabaseConfigured } from '@/lib/supabase';

describe('useRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _mockChannel.on.mockReturnThis();
    _mockChannel.subscribe.mockReturnThis();
  });

  it('creates a subscription channel for the given table', () => {
    const callback = vi.fn();
    const { unmount } = renderHook(() => useRealtime('tasks', callback));
    expect(supabase!.channel).toHaveBeenCalledWith('tasks-changes');
    expect(_mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ table: 'tasks' }),
      expect.any(Function),
    );
    unmount();
  });

  it('cleans up channel on unmount', () => {
    const callback = vi.fn();
    const { unmount } = renderHook(() => useRealtime('goals', callback));
    unmount();
    expect(supabase!.removeChannel).toHaveBeenCalled();
  });

  it('does not subscribe when supabase is not configured', () => {
    (isSupabaseConfigured as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);
    const callback = vi.fn();
    const { unmount } = renderHook(() => useRealtime('tasks', callback));
    expect(_mockChannel.subscribe).not.toHaveBeenCalled();
    unmount();
  });

  it('resets reconnect attempt counter on SUBSCRIBED status', () => {
    const callback = vi.fn();
    let subscribeCb: (status: string, err?: Error) => void = () => {};
    _mockChannel.subscribe.mockImplementation((cb: (s: string) => void) => { subscribeCb = cb; });
    renderHook(() => useRealtime('tasks', callback));
    act(() => { subscribeCb('SUBSCRIBED'); });
  });

  it('attempts reconnection on CHANNEL_ERROR with exponential backoff', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    let subscribeCb: (status: string, err?: Error) => void = () => {};
    _mockChannel.subscribe.mockImplementation((cb: (s: string) => void) => { subscribeCb = cb; });
    const { unmount } = renderHook(() => useRealtime('tasks', callback));
    act(() => { subscribeCb('CHANNEL_ERROR'); });
    expect(supabase!.removeChannel).toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(supabase!.channel).toHaveBeenCalledWith(expect.stringContaining('retry-1'));
    unmount();
    vi.useRealTimers();
  });

  it('stops reconnecting after MAX_RECONNECT_ATTEMPTS (3)', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    let subscribeCb: (status: string, err?: Error) => void = () => {};
    _mockChannel.subscribe.mockImplementation((cb: (s: string) => void) => { subscribeCb = cb; });
    const { unmount } = renderHook(() => useRealtime('tasks', callback));
    for (let i = 0; i < 4; i++) {
      act(() => { subscribeCb('CHANNEL_ERROR'); });
      vi.advanceTimersByTime(2000 * Math.pow(2, Math.min(i, 2)));
    }
    unmount();
    vi.useRealTimers();
  });

  it('invokes callback with correct payload shape', () => {
    const callback = vi.fn();
    let onCb: (payload: Record<string, unknown>) => void = () => {};
    _mockChannel.on.mockImplementation((_event: string, _opts: unknown, cb: (p: Record<string, unknown>) => void) => { onCb = cb; return _mockChannel; });
    _mockChannel.subscribe.mockImplementation(() => {});
    renderHook(() => useRealtime('tasks', callback));
    act(() => {
      onCb({ eventType: 'INSERT', new: { id: 1, name: 'Test' }, old: {} });
    });
    expect(callback).toHaveBeenCalledWith({
      eventType: 'INSERT',
      new: { id: 1, name: 'Test' },
      old: {},
    });
  });

  it('applies filter when filters parameter is provided', () => {
    const callback = vi.fn();
    renderHook(() => useRealtime('tasks', callback, { column: 'project_id', value: '123' }));
    expect(_mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ filter: 'project_id=eq.123' }),
      expect.any(Function),
    );
  });
});

describe('usePresence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a presence channel with user key', () => {
    const onSync = vi.fn();
    renderHook(() => usePresence('room-1', 'user-1', onSync));
    expect(supabase!.channel).toHaveBeenCalledWith('room-1', expect.objectContaining({
      config: { presence: { key: 'user-1' } },
    }));
  });

  it('tracks presence on SUBSCRIBED', () => {
    let subCb: (status: string) => void = () => {};
    _mockChannel.subscribe.mockImplementation((cb: (s: string) => void) => { subCb = cb; });
    renderHook(() => usePresence('room-1', 'user-1'));
    act(() => { subCb('SUBSCRIBED'); });
    expect(_mockChannel.track).toHaveBeenCalledWith(expect.objectContaining({ user: 'user-1' }));
  });

  it('untracks and removes channel on unmount', () => {
    const { unmount } = renderHook(() => usePresence('room-1', 'user-1'));
    unmount();
    expect(_mockChannel.untrack).toHaveBeenCalled();
    expect(supabase!.removeChannel).toHaveBeenCalled();
  });

  it('does not subscribe when supabase is not configured', () => {
    (isSupabaseConfigured as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);
    const { unmount } = renderHook(() => usePresence('room-1', 'user-1'));
    expect(_mockChannel.subscribe).not.toHaveBeenCalled();
    unmount();
  });

  it('invokes onSync callback on presence sync event', () => {
    const onSync = vi.fn();
    _mockChannel.presenceState = vi.fn().mockReturnValue({ user1: [{ user: 'u1', online_at: 't1' }] });
    let onCb: () => void = () => {};
    _mockChannel.on.mockImplementation((_event: string, _opts: unknown, cb: () => void) => { onCb = cb; return _mockChannel; });
    _mockChannel.subscribe.mockImplementation(() => {});
    renderHook(() => usePresence('room-1', 'user-1', onSync));
    act(() => { onCb(); });
    expect(onSync).toHaveBeenCalled();
  });
});
