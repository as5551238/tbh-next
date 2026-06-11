/**
 * Performance Cache Layer
 *
 * Provides in-memory + sessionStorage caching for frequently accessed data.
 * - Reduces redundant Supabase queries
 * - Auto-expires after configurable TTL
 * - Supports manual invalidation
 * - SSR-safe (checks typeof window)
 */

interface CacheEntry<T> {
  data: T;
  expireAt: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

const memoryCache = new Map<string, CacheEntry<unknown>>();

function now(): number {
  return Date.now();
}

function isExpired<T>(entry: CacheEntry<T>): boolean {
  return now() > entry.expireAt;
}

// ── Memory Cache ───────────────────────────────────────────────────────

export function memGet<T>(key: string): T | null {
  const entry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (!entry || isExpired(entry)) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data;
}

export function memSet<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
  memoryCache.set(key, { data, expireAt: now() + ttlMs });
}

export function memDelete(key: string): void {
  memoryCache.delete(key);
}

export function memClear(prefix?: string): void {
  if (!prefix) {
    memoryCache.clear();
    return;
  }
  for (const k of memoryCache.keys()) {
    if (k.startsWith(prefix)) memoryCache.delete(k);
  }
}

// ── Session Storage Cache ──────────────────────────────────────────────

export function ssGet<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`tbh-cache:${key}`);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (isExpired(entry)) {
      sessionStorage.removeItem(`tbh-cache:${key}`);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function ssSet<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: CacheEntry<T> = { data, expireAt: now() + ttlMs };
    sessionStorage.setItem(`tbh-cache:${key}`, JSON.stringify(entry));
  } catch {
    // sessionStorage full — ignore
  }
}

export function ssDelete(key: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(`tbh-cache:${key}`);
}

// ── Dual-Layer Cache (memory + sessionStorage) ────────────────────────

export function cacheGet<T>(key: string): T | null {
  // L1: memory (fastest)
  const mem = memGet<T>(key);
  if (mem !== null) return mem;

  // L2: sessionStorage
  const ss = ssGet<T>(key);
  if (ss !== null) {
    // Promote to memory
    memSet(key, ss);
    return ss;
  }

  return null;
}

export function cacheSet<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
  memSet(key, data, ttlMs);
  ssSet(key, data, ttlMs);
}

export function cacheDelete(key: string): void {
  memDelete(key);
  ssDelete(key);
}

export function cacheClear(prefix?: string): void {
  memClear(prefix);
  if (typeof window === 'undefined') return;
  try {
    const fullPrefix = prefix ? `tbh-cache:${prefix}` : 'tbh-cache:';
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(fullPrefix)) sessionStorage.removeItem(k);
    }
  } catch {}
}

// ── Cache Stats (for debugging) ────────────────────────────────────────

export function cacheStats(): { memoryEntries: number; sessionKeys: number } {
  let sessionKeys = 0;
  if (typeof window !== 'undefined') {
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith('tbh-cache:')) sessionKeys++;
      }
    } catch {}
  }
  return { memoryEntries: memoryCache.size, sessionKeys };
}

// ── Debounced Cache Writer ─────────────────────────────────────────────

const pendingWrites = new Map<string, { data: unknown; ttlMs: number; timer: ReturnType<typeof setTimeout> }>();

/** Debounced cache write — only writes after `delayMs` of inactivity for the same key */
export function cacheSetDebounced<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS, delayMs: number = 2000): void {
  const existing = pendingWrites.get(key);
  if (existing) clearTimeout(existing.timer);

  const timer = setTimeout(() => {
    cacheSet(key, data, ttlMs);
    pendingWrites.delete(key);
  }, delayMs);

  pendingWrites.set(key, { data, ttlMs, timer });
}
