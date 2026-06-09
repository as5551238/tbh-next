import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetSession, mockRefreshSession } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockRefreshSession: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: () => true,
  supabase: {
    auth: {
      getSession: mockGetSession,
      refreshSession: mockRefreshSession,
    },
  },
}));

import { ensureAuthSession, withAuthRetry } from '@/lib/authMiddleware';

describe('ensureAuthSession', () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockRefreshSession.mockReset();
  });

  it('returns true when session is valid and not near expiry', async () => {
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600;
    mockGetSession.mockResolvedValue({
      data: { session: { expires_at: futureExpiry, access_token: 'tok' } },
    });
    expect(await ensureAuthSession()).toBe(true);
  });

  it('refreshes session when current session is near expiry', async () => {
    const nearExpiry = Math.floor(Date.now() / 1000) + 30;
    mockGetSession.mockResolvedValue({
      data: { session: { expires_at: nearExpiry } },
    });
    mockRefreshSession.mockResolvedValue({
      data: { session: { access_token: 'new_tok', expires_at: nearExpiry + 3600 } },
      error: null,
    });
    expect(await ensureAuthSession()).toBe(true);
    expect(mockRefreshSession).toHaveBeenCalled();
  });

  it('returns false when refresh fails', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockRefreshSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'Refresh failed' },
    });
    expect(await ensureAuthSession()).toBe(false);
  });

  it('returns true when no session but refresh succeeds', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockRefreshSession.mockResolvedValue({
      data: { session: { access_token: 'refreshed' } },
      error: null,
    });
    expect(await ensureAuthSession()).toBe(true);
  });

  it('returns false when refresh returns no session with no error', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockRefreshSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    expect(await ensureAuthSession()).toBe(false);
  });
});

describe('withAuthRetry', () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockRefreshSession.mockReset();
    mockGetSession.mockResolvedValue({
      data: { session: { expires_at: Math.floor(Date.now() / 1000) + 3600 } },
    });
    mockRefreshSession.mockResolvedValue({
      data: { session: { access_token: 'new' } },
      error: null,
    });
  });

  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    expect(await withAuthRetry(fn)).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on auth error and succeeds on second attempt', async () => {
    const authErr = Object.assign(new Error('jwt expired'), { status: 401 });
    const fn = vi.fn()
      .mockRejectedValueOnce(authErr)
      .mockResolvedValueOnce('recovered');
    expect(await withAuthRetry(fn, 1)).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry on non-auth errors', async () => {
    const networkErr = new Error('Network error');
    const fn = vi.fn().mockRejectedValue(networkErr);
    await expect(withAuthRetry(fn, 1)).rejects.toThrow('Network error');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('throws after max retries exhausted on persistent auth errors', async () => {
    const authErr = Object.assign(new Error('jwt expired'), { status: 401 });
    const fn = vi.fn().mockRejectedValue(authErr);
    await expect(withAuthRetry(fn, 1)).rejects.toThrow('jwt expired');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries on 403 status code', async () => {
    const forbiddenErr = Object.assign(new Error('forbidden'), { status: 403 });
    const fn = vi.fn()
      .mockRejectedValueOnce(forbiddenErr)
      .mockResolvedValueOnce('ok');
    expect(await withAuthRetry(fn, 1)).toBe('ok');
  });

  it('retries on error message containing "token"', async () => {
    const tokenErr = new Error('Invalid token');
    const fn = vi.fn()
      .mockRejectedValueOnce(tokenErr)
      .mockResolvedValueOnce('ok');
    expect(await withAuthRetry(fn, 1)).toBe('ok');
  });
});
