// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSupabase, mockChannel } = vi.hoisted(() => {
  const channel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    track: vi.fn().mockResolvedValue(undefined),
    untrack: vi.fn().mockReturnThis(),
    presenceState: vi.fn().mockReturnValue({}),
  };
  const supabase = {
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(),
  };
  return { mockSupabase: supabase, mockChannel: channel };
});

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: vi.fn(() => true),
  supabase: mockSupabase,
}));

import { useRealtime, usePresence } from '@/hooks/useRealtime';
import { renderHook, act } from '@testing-library/react';

describe('useRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChannel.on.mockReturnThis();
    mockChannel.subscribe.mockReturnThis();
  });

  it('creates a subscription channel for the given table', () => {
    const callback = vi.fn();
    const { unmount } = renderHook(() => useRealtime('tasks', callback));
    expect(mockSupabase.channel).toHaveBeenCalledWith('tasks-changes');
    unmount();
  });

  it('cleans up channel on unmount', () => {
    const callback = vi.fn();
    const { unmount } = renderHook(() => useRealtime('goals', callback));
    unmount();
    expect(mockSupabase.removeChannel).toHaveBeenCalled();
  });

  it('resets reconnect on SUBSCRIBED', () => {
    const callback = vi.fn();
    let subCb: (status: string) => void = () => {};
    mockChannel.subscribe.mockImplementation((cb: (s: string) => void) => { subCb = cb; });
    renderHook(() => useRealtime('tasks', callback));
    act(() => { subCb('SUBSCRIBED'); });
  });

  it('attempts reconnection on CHANNEL_ERROR', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    let subCb: (status: string) => void = () => {};
    mockChannel.subscribe.mockImplementation((cb: (s: string) => void) => { subCb = cb; });
    const { unmount } = renderHook(() => useRealtime('tasks', callback));
    act(() => { subCb('CHANNEL_ERROR'); });
    vi.advanceTimersByTime(2000);
    unmount();
    vi.useRealTimers();
  });
});

describe('usePresence', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('creates a presence channel with user key', () => {
    const onSync = vi.fn();
    renderHook(() => usePresence('room-1', 'user-1', onSync));
    expect(mockSupabase.channel).toHaveBeenCalledWith('room-1', expect.objectContaining({
      config: { presence: { key: 'user-1' } },
    }));
  });

  it('tracks presence on SUBSCRIBED', () => {
    let subCb: (status: string) => void = () => {};
    mockChannel.subscribe.mockImplementation((cb: (s: string) => void) => { subCb = cb; });
    renderHook(() => usePresence('room-1', 'user-1'));
    act(() => { subCb('SUBSCRIBED'); });
    expect(mockChannel.track).toHaveBeenCalled();
  });

  it('untracks and removes channel on unmount', () => {
    const { unmount } = renderHook(() => usePresence('room-1', 'user-1'));
    unmount();
    expect(mockChannel.untrack).toHaveBeenCalled();
  });
});
