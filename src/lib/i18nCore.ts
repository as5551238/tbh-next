import { useState, useEffect, useCallback } from 'react';

export type Locale = 'zh' | 'en';

export const translations: Record<Locale, Record<string, string>> = {
  zh: {},
  en: {},
};

let currentLocale: Locale = (() => {
  try {
    const stored = localStorage.getItem('tbh-locale');
    if (stored === 'zh' || stored === 'en') return stored;
  } catch {}
  return 'zh';
})();

function flatten(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (val && typeof val === 'object') {
      Object.assign(result, flatten(val as Record<string, unknown>, fullKey));
    } else if (typeof val === 'string') {
      result[fullKey] = val;
    }
  }
  return result;
}

export function registerTranslations(locale: Locale, data: Record<string, unknown>): void {
  translations[locale] = { ...translations[locale], ...flatten(data) };
}

export function t(key: string, params?: Record<string, string | number>): string {
  let result = translations[currentLocale]?.[key] ?? translations['zh']?.[key] ?? key;
  // DR-32 runtime health check: warn if translation missing in DEV mode
  if (import.meta.env.DEV && result === key && key.includes('.')) {
    console.warn(`[i18n] Missing translation: "${key}" (locale: ${currentLocale})`);
  }
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return result;
}

export function setLocale(locale: Locale): void {
  currentLocale = locale;
  try {
    localStorage.setItem('tbh-locale', locale);
  } catch {}
  document.documentElement.lang = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

const listeners = new Set<() => void>();

export function subscribeLocaleChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function setLocaleAndNotify(locale: Locale): void {
  setLocale(locale);
  for (const fn of listeners) fn();
}

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>(getLocale());

  useEffect(() => {
    return subscribeLocaleChange(() => {
      setLocaleState(getLocale());
    });
  }, []);

  const handleSetLocale = useCallback((l: Locale) => {
    setLocaleAndNotify(l);
  }, []);

  return { locale, setLocale: handleSetLocale, t } as const;
}
