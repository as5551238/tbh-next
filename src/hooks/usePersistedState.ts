import { useState, useEffect, useCallback } from 'react';

/**
 * Persisted state hook that uses dataLayer for Supabase persistence,
 * with localStorage as instant-feedback cache and fallback.
 */

// Maps storage keys to dataLayer fetch/replace functions
const SYNC_MAP: Record<string, {
  fetch: () => Promise<any>;
  replace: (ids: any) => Promise<void>;
  transform: (rows: any[]) => any;
}> = {
  'tbh-installed-agents': {
    fetch: async () => (await import('@/lib/dataLayer')).fetchInstalledAgents(),
    replace: async (ids: Set<string>) => (await import('@/lib/dataLayer')).replaceInstalledAgents([...ids]),
    transform: (rows) => new Set(rows.map((r: any) => r.agent_id)),
  },
  'tbh-running-workflows': {
    fetch: async () => (await import('@/lib/dataLayer')).fetchRunningWorkflows(),
    replace: async (ids: Set<string>) => (await import('@/lib/dataLayer')).replaceRunningWorkflows([...ids]),
    transform: (rows) => new Set(rows.map((r: any) => r.workflow_id)),
  },
  'tbh-mcp-status': {
    fetch: async () => (await import('@/lib/dataLayer')).fetchMcpStatuses(),
    replace: async (statuses: Record<string, any>) => (await import('@/lib/dataLayer')).replaceMcpStatuses(statuses),
    transform: (rows) => {
      const obj: Record<string, any> = {};
      for (const row of rows) obj[row.server_id] = row.status;
      return obj;
    },
  },
  'tbh-installed-packs': {
    fetch: async () => (await import('@/lib/dataLayer')).fetchInstalledPacks(),
    replace: async (ids: Set<string>) => (await import('@/lib/dataLayer')).replaceInstalledPacks([...ids]),
    transform: (rows) => new Set(rows.map((r: any) => r.pack_id)),
  },
  'tbh-agent-configs': {
    fetch: async () => (await import('@/lib/dataLayer')).fetchAgentConfigs(),
    replace: async (map: Record<string, any>) => {
      const { upsertAgentConfig } = await import('@/lib/dataLayer');
      for (const [name, cfg] of Object.entries(map)) {
        await upsertAgentConfig({
          name,
          model: cfg.model ?? '',
          temperature: cfg.temperature ?? 0.5,
          max_tokens: cfg.maxTokens ?? 2000,
          system_prompt: cfg.systemPrompt ?? '',
          schedule: cfg.schedule ?? '',
          enabled: cfg.enabled ?? true,
          sort_order: cfg.sortOrder ?? 0,
          team_id: '__default__',
          member_id: 'demo',
        });
      }
    },
    transform: (rows) => {
      const map: Record<string, any> = {};
      for (const row of rows) {
        map[row.name] = {
          model: row.model,
          temperature: row.temperature,
          maxTokens: row.max_tokens,
          systemPrompt: row.system_prompt,
          schedule: row.schedule,
          enabled: row.enabled,
          sortOrder: row.sort_order,
        };
      }
      return map;
    },
  },
};

function readFromLS<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(key);
    if (!s) return fallback;
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed)) return new Set(parsed) as unknown as T;
    return parsed as T;
  } catch {
    return fallback;
  }
}

function writeToLS(key: string, value: any): void {
  try {
    const serialized = value instanceof Set ? [...value] : value;
    localStorage.setItem(key, JSON.stringify(serialized));
  } catch { /* quota exceeded */ }
}

/**
 * Hook that provides persisted state backed by dataLayer (Supabase) with localStorage fallback.
 * State initializes from localStorage for instant render, then syncs from Supabase.
 */
export function usePersistedState<T>(
  storageKey: string,
  fallback: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => readFromLS(storageKey, fallback));
  const config = SYNC_MAP[storageKey];

  // Sync from Supabase via dataLayer on mount
  useEffect(() => {
    if (!config) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await config.fetch();
        if (rows && rows.length > 0 && !cancelled) {
          const transformed = config.transform(rows);
          setState(transformed as T);
          writeToLS(storageKey, transformed);
        }
      } catch { /* silent — will use localStorage fallback */ }
    })();
    return () => { cancelled = true; };
  }, [config, storageKey]);

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setState((prev) => {
      const next = value instanceof Function ? value(prev) : value;
      // Always write to localStorage for instant feedback
      writeToLS(storageKey, next);
      // Async persist to Supabase via dataLayer
      if (config) {
        config.replace(next).catch(() => {});
      }
      return next;
    });
  }, [storageKey, config]);

  return [state, setValue];
}
