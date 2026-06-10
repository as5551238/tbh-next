import { checkSupabaseHealth } from '@/lib/dataLayer';
import { isSupabaseConfigured } from '@/lib/supabase';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    supabase: { status: 'connected' | 'unavailable' | 'skipped'; latencyMs?: number };
    memory: { usedMB: number; limitMB: number; status: 'ok' | 'warning' | 'critical' };
  };
}

export async function runHealthCheck(): Promise<HealthStatus> {
  const checks: HealthStatus['checks'] = {
    supabase: { status: 'skipped' },
    memory: { usedMB: 0, limitMB: 100, status: 'ok' },
  };

  if (typeof performance !== 'undefined' && 'memory' in performance) {
    const mem = (performance as any).memory;
    const usedMB = Math.round((mem.usedJSHeapSize || 0) / 1024 / 1024);
    const limitMB = Math.round((mem.jsHeapSizeLimit || 100 * 1024 * 1024) / 1024);
    checks.memory = {
      usedMB,
      limitMB,
      status: usedMB / limitMB > 0.9 ? 'critical' : usedMB / limitMB > 0.7 ? 'warning' : 'ok',
    };
  }

  if (isSupabaseConfigured()) {
    const start = Date.now();
    try {
      const healthy = await checkSupabaseHealth();
      checks.supabase = { status: healthy === 'ok' ? 'connected' : 'unavailable', latencyMs: Date.now() - start };
    } catch {
      checks.supabase = { status: 'unavailable', latencyMs: Date.now() - start };
    }
  }

  const hasProblem = checks.supabase.status === 'unavailable' || checks.memory.status === 'critical';
  const hasWarning = checks.supabase.status !== 'connected' || checks.memory.status === 'warning';

  return {
    status: hasProblem ? 'unhealthy' : hasWarning ? 'degraded' : 'healthy',
    timestamp: new Date().toISOString(),
    checks,
  };
}
