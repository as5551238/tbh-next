import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const AUTH_RETRY_DELAY_MS = 500;

function isAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { status?: number; code?: string; message?: string };
  return (
    e.status === 401 ||
    e.status === 403 ||
    e.code === 'PGRST301' ||
    (typeof e.message === 'string' && /jwt|token|unauthorized|forbidden/i.test(e.message))
  );
}

export async function ensureAuthSession(): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return true;
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    const expiresAt = session.expires_at ?? 0;
    const now = Math.floor(Date.now() / 1000);
    if (expiresAt - now > 60) return true;
  }
  const { data: { session: refreshed }, error } = await supabase.auth.refreshSession();
  if (error || !refreshed) {
    console.warn('[authMiddleware] Session refresh failed:', error?.message);
    return false;
  }
  return true;
}

export async function withAuthRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 1,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isAuthError(err) || attempt >= maxRetries) throw err;
      console.warn(`[authMiddleware] Auth error on attempt ${attempt + 1}, refreshing session...`);
      const ok = await ensureAuthSession();
      if (!ok) throw err;
      await new Promise((r) => setTimeout(r, AUTH_RETRY_DELAY_MS));
    }
  }
  throw lastError;
}
