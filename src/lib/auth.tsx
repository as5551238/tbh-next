import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { refreshPlanFromServer } from '@/lib/subscription';
import { useAppStore } from '@/stores/appStore';
import { useEffect, useState, useCallback } from 'react';

// --- Types ---

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  name: string;
}

// --- Demo auth fallback (when Supabase not configured) ---

const DEMO_AUTH_KEY = 'tbh-next-auth';
const DEMO_USER_KEY = 'tbh-next-user';

function getDemoUser(): AuthUser | null {
  const authed = localStorage.getItem(DEMO_AUTH_KEY) === '1';
  if (!authed) return null;
  try {
    return JSON.parse(localStorage.getItem(DEMO_USER_KEY) ?? 'null');
  } catch {
    return null;
  }
}

function setDemoAuth(user: AuthUser | null): void {
  if (user) {
    localStorage.setItem(DEMO_AUTH_KEY, '1');
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(DEMO_AUTH_KEY);
    localStorage.removeItem(DEMO_USER_KEY);
  }
}

// --- Public API ---

/**
 * Async version: checks if user is authenticated.
 * The sync version was broken — supabase!.auth.getSession() returns a Promise,
 * so !!Promise is always true. This async version awaits the result.
 */
export async function isAuthenticatedAsync(): Promise<boolean> {
  try {
    if (isSupabaseConfigured() && supabase) {
      const { data: { session } } = await supabase!.auth.getSession();
      return !!session;
    }
    return !!getDemoUser();
  } catch (err) {
    console.error('[isAuthenticatedAsync]', err);
    return false;
  }
}

/**
 * Sync check: only reliable for demo mode.
 * For Supabase mode, use isAuthenticatedAsync() or the useAuth() hook.
 */
export function isAuthenticated(): boolean {
  if (isSupabaseConfigured()) {
    // Cannot synchronously check Supabase session.
    // Return false to be safe — caller should use isAuthenticatedAsync() or useAuth().
    console.warn('isAuthenticated(): Supabase mode requires async check. Use isAuthenticatedAsync() or useAuth() hook instead.');
    return false;
  }
  return !!getDemoUser();
}

/**
 * Async version: gets the current authenticated user.
 */
export async function getCurrentUserAsync(): Promise<AuthUser | null> {
  try {
    if (isSupabaseConfigured() && supabase) {
      const { data: { session } } = await supabase!.auth.getSession();
      if (session?.user) {
        const meta = session.user.user_metadata ?? {};
        return {
          id: session.user.id,
          email: session.user.email ?? '',
          role: meta.role ?? 'member',
          name: meta.name ?? session.user.email?.split('@')[0] ?? 'User',
        };
      }
      return null;
    }
    return getDemoUser();
  } catch (err) {
    console.error('[getCurrentUserAsync]', err);
    clearAuth();
    return null;
  }
}

/**
 * Sync version: only reliable for demo mode.
 * For Supabase mode, use getCurrentUserAsync().
 */
export function getCurrentUser(): AuthUser | null {
  if (isSupabaseConfigured()) {
    // Cannot synchronously get Supabase user.
    // Use getCurrentUserAsync() or useAuth() hook instead.
    return null;
  }
  return getDemoUser();
}

export function clearAuth(): void {
  if (isSupabaseConfigured() && supabase) {
    supabase!.auth.signOut();
  }
  setDemoAuth(null);
}

// --- Demo login ---

export async function demoLogin(name: string, email: string, role: string = 'member'): Promise<AuthUser> {
  try {
    const user: AuthUser = {
      id: `demo-${Date.now()}`,
      email,
      role,
      name,
    };
    setDemoAuth(user);
    return user;
  } catch (err) {
    console.error('[demoLogin]', err);
    clearAuth();
    throw err;
  }
}

// --- Supabase Auth login ---

export async function supabaseLogin(email: string, password: string): Promise<AuthUser> {
  try {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase!.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const meta = data.user?.user_metadata ?? {};
    return {
      id: data.user.id,
      email: data.user.email ?? email,
      role: meta.role ?? 'member',
      name: meta.name ?? email.split('@')[0],
    };
  } catch (err) {
    console.error('[supabaseLogin]', err);
    clearAuth();
    throw err;
  }
}

export async function supabaseSignup(email: string, password: string, name: string): Promise<AuthUser> {
  try {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase!.auth.signUp({
      email,
      password,
      options: { data: { name, role: 'member' } },
    });
    if (error) throw error;

    return {
      id: data.user?.id ?? '',
      email,
      role: 'member',
      name,
    };
  } catch (err) {
    console.error('[supabaseSignup]', err);
    clearAuth();
    throw err;
  }
}

/** Send password reset email via Supabase Auth */
export async function supabaseResetPassword(email: string): Promise<void> {
  try {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase!.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) throw error;
  } catch (err) {
    console.error('[supabaseResetPassword]', err);
    clearAuth();
    throw err;
  }
}

// --- React hook for auth state ---

const SESSION_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const setStoreAuthUser = useAppStore((s) => s.setAuthUser);

  const syncUser = useCallback((u: AuthUser | null) => {
    setUser(u);
    setStoreAuthUser(u);
  }, [setStoreAuthUser]);

  const initAuth = useCallback(async () => {
    try {
      if (isSupabaseConfigured() && supabase) {
        const { data: { session } } = await supabase!.auth.getSession();
        if (session?.user) {
          const meta = session.user.user_metadata ?? {};
          syncUser({
            id: session.user.id,
            email: session.user.email ?? '',
            role: meta.role ?? 'member',
            name: meta.name ?? session.user.email?.split('@')[0] ?? 'User',
          });
        } else {
          // Demo fallback: if no Supabase session, check demo localStorage
          const demoUser = getDemoUser();
          if (demoUser) syncUser(demoUser);
        }
        const { data: { subscription } } = supabase!.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            const meta = session.user.user_metadata ?? {};
            syncUser({
              id: session.user.id,
              email: session.user.email ?? '',
              role: meta.role ?? 'member',
              name: meta.name ?? session.user.email?.split('@')[0] ?? 'User',
            });
            refreshPlanFromServer(session.user.id).catch(() => {});
          } else {
            // Demo fallback: don't clear if demo auth exists
            const demoUser = getDemoUser();
            syncUser(demoUser);
          }
        });
        setLoading(false);
        return () => subscription.unsubscribe();
      } else {
        syncUser(getDemoUser());
        setLoading(false);
      }
    } catch (err) {
      console.error('[initAuth]', err);
      clearAuth();
      syncUser(null);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cleanup = initAuth();
    return () => { cleanup?.then?.((fn) => fn?.()); };
  }, [initAuth]);

  // Session keep-alive: refresh every 5 minutes, auto-logout on failure
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;
    const interval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase!.auth.getSession();
        if (!session) {
          const { data: { session: refreshed }, error } = await supabase!.auth.refreshSession();
          if (error || !refreshed) {
            console.warn('[useAuth] Session refresh failed, logging out');
            clearAuth();
            syncUser(null);
          }
        }
      } catch (err) {
        console.error('[useAuth] Session refresh error:', err);
        clearAuth();
        syncUser(null);
      }
    }, SESSION_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [syncUser]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      if (isSupabaseConfigured()) {
        const u = await supabaseLogin(email, password);
        syncUser(u);
        return u;
      }
      const u = await demoLogin(email.split('@')[0] ?? 'User', email);
      syncUser(u);
      return u;
    } catch (err) {
      console.error('[login]', err);
      clearAuth();
      syncUser(null);
      throw err;
    }
  }, [syncUser]);

  const logout = useCallback(async () => {
    try {
      clearAuth();
      syncUser(null);
    } catch (err) {
      console.error('[logout]', err);
      clearAuth();
      syncUser(null);
    }
  }, [syncUser]);

  return { user, loading, login, logout, isAuthenticated: !!user };
}

// --- Route guard component ---

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Demo fallback: check localStorage immediately for non-Supabase mode
  if (!isSupabaseConfigured() && !getDemoUser()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-xs text-text-3">加载中...</span>
        </div>
      </div>
    );
  }

  if (!user && isSupabaseConfigured() && !getDemoUser()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
