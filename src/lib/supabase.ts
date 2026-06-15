import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Runtime config keys (set by SupabaseSetupPage or localStorage)
const STORAGE_URL_KEY = 'tbh-next-supabase-url';
const STORAGE_ANON_KEY = 'tbh-next-supabase-anon-key';

function getRuntimeConfig(): { url: string; anonKey: string } {
  // 1. Runtime: sessionStorage (set by SupabaseSetupPage during session)
  const ssUrl = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(STORAGE_URL_KEY) : null;
  const ssKey = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(STORAGE_ANON_KEY) : null;
  if (ssUrl && ssKey) return { url: ssUrl, anonKey: ssKey };

  // 2. Runtime: localStorage (persisted across sessions)
  const lsUrl = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_URL_KEY) : null;
  const lsKey = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_ANON_KEY) : null;
  if (lsUrl && lsKey) return { url: lsUrl, anonKey: lsKey };

  // 3. Build-time: VITE_ env vars (baked into bundle at build time)
  return {
    url: import.meta.env.VITE_SUPABASE_URL ?? '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  };
}

const config = getRuntimeConfig();

export const supabase: SupabaseClient | null = config.url && config.anonKey
  ? createClient(config.url, config.anonKey)
  : null;

export function isSupabaseConfigured(): boolean {
  return !!(config.url && config.anonKey);
}

/** Save Supabase credentials to both sessionStorage and localStorage, return new client */
export function saveSupabaseConfig(url: string, anonKey: string): SupabaseClient {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(STORAGE_URL_KEY, url);
    sessionStorage.setItem(STORAGE_ANON_KEY, anonKey);
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_URL_KEY, url);
    localStorage.setItem(STORAGE_ANON_KEY, anonKey);
  }
  return createClient(url, anonKey);
}
