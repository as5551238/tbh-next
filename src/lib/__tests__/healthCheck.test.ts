import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/dataLayer', () => ({
  checkSupabaseHealth: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: vi.fn(),
}));

import { runHealthCheck } from '@/lib/healthCheck';
import { checkSupabaseHealth } from '@/lib/dataLayer';
import { isSupabaseConfigured } from '@/lib/supabase';

const mockCheckSupabaseHealth = vi.mocked(checkSupabaseHealth);
const mockIsSupabaseConfigured = vi.mocked(isSupabaseConfigured);

describe('runHealthCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns healthy when supabase connected and memory ok', async () => {
    mockIsSupabaseConfigured.mockReturnValue(true);
    mockCheckSupabaseHealth.mockResolvedValue('ok' as const);

    const result = await runHealthCheck();

    expect(result.status).toBe('healthy');
    expect(result.checks.supabase.status).toBe('connected');
    expect(result.checks.supabase.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.checks.memory.status).toBe('ok');
    expect(result.timestamp).toBeTruthy();
  });

  it('returns unhealthy when supabase unavailable', async () => {
    mockIsSupabaseConfigured.mockReturnValue(true);
    mockCheckSupabaseHealth.mockResolvedValue('error');

    const result = await runHealthCheck();

    expect(result.status).toBe('unhealthy');
    expect(result.checks.supabase.status).toBe('unavailable');
  });

  it('returns degraded when supabase not configured (skipped)', async () => {
    mockIsSupabaseConfigured.mockReturnValue(false);

    const result = await runHealthCheck();

    expect(result.status).toBe('degraded');
    expect(result.checks.supabase.status).toBe('skipped');
  });

  it('returns unhealthy when supabase throws', async () => {
    mockIsSupabaseConfigured.mockReturnValue(true);
    mockCheckSupabaseHealth.mockRejectedValue(new Error('connection refused'));

    const result = await runHealthCheck();

    expect(result.status).toBe('unhealthy');
    expect(result.checks.supabase.status).toBe('unavailable');
  });
});
