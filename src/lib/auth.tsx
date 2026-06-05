import { Navigate, useLocation } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
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

export function isAuthenticated(): boolean {
  if (isSupabaseConfigured()) {
    return !!supabase?.auth.getSession();
  }
  return !!getDemoUser();
}

export function getCurrentUser(): AuthUser | null {
  if (isSupabaseConfigured()) {
    const session = supabase?.auth.getSession();
    // Session is async, use the hook instead for real auth
    return null;
  }
  return getDemoUser();
}

export function clearAuth(): void {
  if (isSupabaseConfigured() && supabase) {
    supabase.auth.signOut();
  }
  setDemoAuth(null);
}

// --- Demo login ---

export async function demoLogin(name: string, email: string, role: string = 'member'): Promise<AuthUser> {
  const user: AuthUser = {
    id: `demo-${Date.now()}`,
    email,
    role,
    name,
  };
  setDemoAuth(user);
  return user;
}

// --- Supabase Auth login ---

export async function supabaseLogin(email: string, password: string): Promise<AuthUser> {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const meta = data.user?.user_metadata ?? {};
  return {
    id: data.user.id,
    email: data.user.email ?? email,
    role: meta.role ?? 'member',
    name: meta.name ?? email.split('@')[0],
  };
}

export async function supabaseSignup(email: string, password: string, name: string): Promise<AuthUser> {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase.auth.signUp({
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
}

// --- React hook for auth state ---

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const initAuth = useCallback(async () => {
    if (isSupabaseConfigured() && supabase) {
      // Try to get existing session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const meta = session.user.user_metadata ?? {};
        setUser({
          id: session.user.id,
          email: session.user.email ?? '',
          role: meta.role ?? 'member',
          name: meta.name ?? session.user.email?.split('@')[0] ?? 'User',
        });
      }
      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const meta = session.user.user_metadata ?? {};
          setUser({
            id: session.user.id,
            email: session.user.email ?? '',
            role: meta.role ?? 'member',
            name: meta.name ?? session.user.email?.split('@')[0] ?? 'User',
          });
        } else {
          setUser(null);
        }
      });
      setLoading(false);
      return () => subscription.unsubscribe();
    } else {
      // Demo mode
      setUser(getDemoUser());
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cleanup = initAuth();
    return () => { cleanup?.then?.((fn) => fn?.()); };
  }, [initAuth]);

  const login = useCallback(async (email: string, password: string) => {
    if (isSupabaseConfigured()) {
      const u = await supabaseLogin(email, password);
      setUser(u);
      return u;
    }
    const u = await demoLogin(email.split('@')[0] ?? 'User', email);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    clearAuth();
    setUser(null);
  }, []);

  return { user, loading, login, logout, isAuthenticated: !!user };
}

// --- Route guard component ---

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Demo fallback: check localStorage immediately for non-Supabase mode
  if (!isSupabaseConfigured() && !getDemoUser()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0c12]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-xs text-text-3">加载中...</span>
        </div>
      </div>
    );
  }

  if (!user && isSupabaseConfigured()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
