// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock supabase before importing auth
vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: () => false,
  supabase: null,
}));

import {
  demoLogin,
  clearAuth,
  isAuthenticated,
  getCurrentUser,
} from '@/lib/auth';

describe('Auth module (demo mode)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('demoLogin creates user in localStorage', async () => {
    const user = await demoLogin('Test User', 'test@example.com', 'admin');
    expect(user.name).toBe('Test User');
    expect(user.email).toBe('test@example.com');
    expect(user.role).toBe('admin');
    expect(user.id).toMatch(/^demo-/);
  });

  it('isAuthenticated returns false when not logged in', () => {
    expect(isAuthenticated()).toBe(false);
  });

  it('isAuthenticated returns true after demoLogin', async () => {
    await demoLogin('User', 'u@test.com');
    expect(isAuthenticated()).toBe(true);
  });

  it('getCurrentUser returns null when not logged in', () => {
    expect(getCurrentUser()).toBeNull();
  });

  it('getCurrentUser returns user after demoLogin', async () => {
    await demoLogin('Alice', 'alice@test.com', 'leader');
    const user = getCurrentUser();
    expect(user).not.toBeNull();
    expect(user!.name).toBe('Alice');
    expect(user!.role).toBe('leader');
  });

  it('clearAuth removes user from localStorage', async () => {
    await demoLogin('Bob', 'bob@test.com');
    expect(isAuthenticated()).toBe(true);
    clearAuth();
    expect(isAuthenticated()).toBe(false);
    expect(getCurrentUser()).toBeNull();
  });

  it('getCurrentUser returns null for corrupt localStorage data', async () => {
    localStorage.setItem('tbh-next-auth', '1');
    localStorage.setItem('tbh-next-user', '{invalid json');
    const user = getCurrentUser();
    expect(user).toBeNull();
  });
});
