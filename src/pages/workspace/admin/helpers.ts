import type { ReactNode } from 'react';
import { createApiKey } from '@/lib/dataLayer';

export type ApiKeyEntry = { id: string; name: string; key: string; created: string };

export type ConfigItem = {
  icon: ReactNode;
  label: string;
  value: string;
  status: string;
};

export function maskKey(key: string): string {
  if (key.length <= 8) return '****';
  return key.slice(0, 4) + '****' + key.slice(-4);
}

export function encodeKey(key: string): string {
  try { return btoa(unescape(encodeURIComponent(key))); } catch { return btoa(key); }
}

export function decodeKey(encoded: string): string {
  try { return decodeURIComponent(escape(atob(encoded))); } catch { return atob(encoded); }
}

export async function migrateLocalStorageKeys(): Promise<void> {
  try {
    const raw = localStorage.getItem('tbh-api-keys');
    if (!raw) return;
    const old: ApiKeyEntry[] = JSON.parse(raw);
    if (!old.length) return;
    for (const k of old) {
      try {
        await createApiKey({ provider: k.name, encrypted_key: encodeKey(k.key) });
      } catch { /* already exists */ }
    }
    localStorage.removeItem('tbh-api-keys');
  } catch { /* parse error */ }
}
