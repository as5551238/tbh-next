/**
 * System Health Monitor
 *
 * Provides runtime observability for TBH-Next:
 * - Component render timing (via Performance API)
 * - API call statistics (success/failure/latency)
 * - Error tracking (React error boundary counts)
 * - Cache hit/miss statistics
 * - Feature flag status overview
 * - Version info
 *
 * DR-51: Monitoring can be toggled, default off in production.
 */

// ── Types ─────────────────────────────────────────────────────────────

export interface RenderMetric {
  componentName: string;
  avgMs: number;
  maxMs: number;
  count: number;
  lastRenderAt: string;
}

export interface ApiCallMetric {
  endpoint: string;
  successCount: number;
  failureCount: number;
  avgMs: number;
  lastCallAt: string;
}

export interface ErrorRecord {
  id: string;
  source: string;
  message: string;
  count: number;
  lastOccurrence: string;
}

export interface SystemHealthSnapshot {
  timestamp: string;
  renders: RenderMetric[];
  apiCalls: ApiCallMetric[];
  errors: ErrorRecord[];
  cacheStats: { memoryEntries: number; sessionKeys: number };
  perfNow: number;
  memoryUsage?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
}

// ── Metric Storage ─────────────────────────────────────────────────────

const METRICS_KEY = 'tbh-monitor-metrics';
const enabled_key = 'tbh-monitor-enabled';

export function isMonitorEnabled(): boolean {
  try {
    return localStorage.getItem(enabled_key) === 'true';
  } catch {
    return false;
  }
}

export function setMonitorEnabled(on: boolean): void {
  localStorage.setItem(enabled_key, String(on));
}

interface StoredMetrics {
  renders: Record<string, { totalMs: number; maxMs: number; count: number; lastRenderAt: string }>;
  apiCalls: Record<string, { successCount: number; failureCount: number; totalMs: number; lastCallAt: string }>;
  errors: Record<string, { source: string; message: string; count: number; lastOccurrence: string }>;
}

function loadMetrics(): StoredMetrics {
  try {
    const raw = localStorage.getItem(METRICS_KEY);
    return raw ? JSON.parse(raw) : { renders: {}, apiCalls: {}, errors: {} };
  } catch {
    return { renders: {}, apiCalls: {}, errors: {} };
  }
}

function saveMetrics(metrics: StoredMetrics): void {
  try {
    localStorage.setItem(METRICS_KEY, JSON.stringify(metrics));
  } catch {
    // Storage full — compress by removing oldest entries
    const compressed: StoredMetrics = {
      renders: {},
      apiCalls: {},
      errors: {},
    };
    // Keep only top 20 renders by count
    const topRenders = Object.entries(metrics.renders)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 20);
    for (const [k, v] of topRenders) compressed.renders[k] = v;

    // Keep only top 20 API calls by total count
    const topApis = Object.entries(metrics.apiCalls)
      .sort((a, b) => (b[1].successCount + b[1].failureCount) - (a[1].successCount + a[1].failureCount))
      .slice(0, 20);
    for (const [k, v] of topApis) compressed.apiCalls[k] = v;

    // Keep only top 20 errors by count
    const topErrors = Object.entries(metrics.errors)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 20);
    for (const [k, v] of topErrors) compressed.errors[k] = v;

    try {
      localStorage.setItem(METRICS_KEY, JSON.stringify(compressed));
    } catch {}
  }
}

// ── Record Functions ───────────────────────────────────────────────────

export function recordRender(componentName: string, durationMs: number): void {
  if (!isMonitorEnabled()) return;
  const metrics = loadMetrics();
  const existing = metrics.renders[componentName];
  if (existing) {
    existing.totalMs += durationMs;
    existing.maxMs = Math.max(existing.maxMs, durationMs);
    existing.count++;
    existing.lastRenderAt = new Date().toISOString();
  } else {
    metrics.renders[componentName] = {
      totalMs: durationMs,
      maxMs: durationMs,
      count: 1,
      lastRenderAt: new Date().toISOString(),
    };
  }
  saveMetrics(metrics);
}

export function recordApiCall(endpoint: string, durationMs: number, success: boolean): void {
  if (!isMonitorEnabled()) return;
  const metrics = loadMetrics();
  const existing = metrics.apiCalls[endpoint];
  if (existing) {
    if (success) existing.successCount++;
    else existing.failureCount++;
    existing.totalMs += durationMs;
    existing.lastCallAt = new Date().toISOString();
  } else {
    metrics.apiCalls[endpoint] = {
      successCount: success ? 1 : 0,
      failureCount: success ? 0 : 1,
      totalMs: durationMs,
      lastCallAt: new Date().toISOString(),
    };
  }
  saveMetrics(metrics);
}

export function recordError(source: string, message: string): void {
  if (!isMonitorEnabled()) return;
  const metrics = loadMetrics();
  const key = `${source}:${message.slice(0, 50)}`;
  const existing = metrics.errors[key];
  if (existing) {
    existing.count++;
    existing.lastOccurrence = new Date().toISOString();
  } else {
    metrics.errors[key] = {
      source,
      message: message.slice(0, 200),
      count: 1,
      lastOccurrence: new Date().toISOString(),
    };
  }
  saveMetrics(metrics);
}

// ── Snapshot ───────────────────────────────────────────────────────────

export function getSystemHealthSnapshot(): SystemHealthSnapshot {
  const metrics = loadMetrics();
  const cacheStats = { memoryEntries: 0, sessionKeys: 0 };

  // Calculate cache stats inline (avoid circular dep)
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith('tbh-cache:')) cacheStats.sessionKeys++;
    }
  } catch {}

  const renders: RenderMetric[] = Object.entries(metrics.renders).map(([name, m]) => ({
    componentName: name,
    avgMs: Math.round(m.totalMs / m.count),
    maxMs: Math.round(m.maxMs),
    count: m.count,
    lastRenderAt: m.lastRenderAt,
  }));

  const apiCalls: ApiCallMetric[] = Object.entries(metrics.apiCalls).map(([ep, m]) => ({
    endpoint: ep,
    successCount: m.successCount,
    failureCount: m.failureCount,
    avgMs: Math.round(m.totalMs / (m.successCount + m.failureCount)),
    lastCallAt: m.lastCallAt,
  }));

  const errors: ErrorRecord[] = Object.entries(metrics.errors).map(([id, e]) => ({
    id,
    source: e.source,
    message: e.message,
    count: e.count,
    lastOccurrence: e.lastOccurrence,
  }));

  const memoryUsage = typeof performance !== 'undefined' && (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory
    ? (performance as unknown as { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory
    : undefined;

  return {
    timestamp: new Date().toISOString(),
    renders: renders.sort((a, b) => b.count - a.count),
    apiCalls: apiCalls.sort((a, b) => (b.successCount + b.failureCount) - (a.successCount + a.failureCount)),
    errors: errors.sort((a, b) => b.count - a.count),
    cacheStats,
    perfNow: typeof performance !== 'undefined' ? Math.round(performance.now()) : 0,
    memoryUsage,
  };
}

// ── Reset ──────────────────────────────────────────────────────────────

export function resetMetrics(): void {
  localStorage.removeItem(METRICS_KEY);
}

// ── Version Management ─────────────────────────────────────────────────

export const APP_VERSION = '2.8.0';
export const VERSION_DATE = '2026-06-11';
export const VERSION_LABEL = 'TBH-Next Enterprise Edition';

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '2.8.0',
    date: '2026-06-11',
    changes: [
      'Week 8: System health monitor + Version management',
      'Week 7: Command Center dashboard + Performance cache',
      'Week 6: Cross-dept automation + Usage alerts',
      'Week 5: DSTE closed-loop + Industry template wizard',
      'Week 4: Organization 4-level hierarchy + Behavior tracking',
      'Week 3: Risk warning engine + AI weekly report',
      'Week 2: Dual-endpoint routing + Employee simple view',
      'Week 1: Intent parser (L0+L1+L2) + 8-field task model',
    ],
  },
  {
    version: '2.0.0',
    date: '2026-06-02',
    changes: [
      'Phase 0-6: AI ignition, RBAC, payment security, PWA, AI module awareness',
      'PageHeader, permissions, real data, AI actions, dynamic badges',
      'Performance, responsive, CSS variables, a11y',
    ],
  },
];
