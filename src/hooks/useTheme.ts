import { useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';

export type Theme = 'dark' | 'light' | 'system';

const THEME_KEY = 'tbh-theme';

function getSystemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
  }
}

/** Initialize theme from localStorage on app startup */
export function initTheme() {
  const stored = (localStorage.getItem(THEME_KEY) as Theme) || 'dark';
  applyTheme(stored);
}

/** React hook to manage theme — reads from appStore, applies to DOM */
export function useTheme() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // Listen for system theme changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    function handleChange() {
      applyTheme('system');
    }
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, [theme]);

  const resolved = theme === 'system' ? getSystemTheme() : theme;

  return { theme, setTheme, resolved };
}
