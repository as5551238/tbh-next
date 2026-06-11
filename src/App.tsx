import React, { type JSX } from 'react';
import { lazy, Suspense, useEffect, type LazyExoticComponent, type CSSProperties } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAppStore, ADMIN_ONLY_MODULES } from '@/stores/appStore';
import { useIndustryColor, useDepartments } from '@/hooks/useMatrix';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useAuth } from '@/lib/auth';
import GlobalSidebar from '@/components/GlobalSidebar';
import ModuleSidebar from '@/components/ModuleSidebar';
import TopBar from '@/components/TopBar';
import ContextPanel from '@/components/contextPanel';
import PageErrorBoundary from '@/components/PageErrorBoundary';
import OnboardingOverlay from '@/components/OnboardingOverlay';
import OnboardingFlow from '@/components/OnboardingFlow';
import ShortcutHelp from '@/components/ShortcutHelp';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import { cn } from '@/lib/utils';
import { retryLazy } from '@/lib/retryLazy';

const Workspace = lazy(retryLazy(() => import('@/pages/Workspace')));
const Collab = lazy(retryLazy(() => import('@/pages/Collab')));
const PersonalAI = lazy(retryLazy(() => import('@/pages/PersonalAI')));

function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-xs text-text-3">加载中...</span>
      </div>
    </div>
  );
}

const PAGE_MAP: Record<string, LazyExoticComponent<() => JSX.Element>> = {
  workspace: Workspace,
  collab: Collab,
  ai: PersonalAI,
};

/** Sync URL → zustand store (interface + module from path) + viewMode guard */
function RouteSync() {
  const location = useLocation();
  const navigate = useNavigate();
  const authUser = useAppStore((s) => s.authUser);
  const viewMode = useAppStore((s) => s.viewMode);

  useEffect(() => {
    const segments = location.pathname.split('/').filter(Boolean);
    if (segments[0] && ['workspace', 'collab', 'ai'].includes(segments[0])) {
      const store = useAppStore.getState();
      const iface = segments[0];
      const mod = segments[1];
      // viewMode guard: simple users cannot access admin modules via URL
      // Skip guard until auth is resolved (authUser !== null) to avoid race condition
      if (authUser !== null && viewMode === 'simple' && mod && ADMIN_ONLY_MODULES.has(mod)) {
        const defaultMod = viewMode === 'simple' ? 'mywork' : 'overview';
        navigate(`/${iface}/${defaultMod}`, { replace: true });
        return;
      }
      // Only sync if different from current state (avoid infinite loop)
      if (store.interface !== iface || (mod && store.activeModule !== mod)) {
        store.navigateTo(iface, mod);
      }
    }
  }, [location.pathname, navigate, authUser, viewMode]);

  return null;
}

/** Convenience hook for module-level navigation */
export function useNavigateModule() {
  const navigate = useNavigate();
  const iface = useAppStore((s) => s.interface);
  return (mod: string) => {
    navigate(`/${iface}/${mod}`);
  };
}

/** Mobile bottom tab bar */
function MobileTabBar() {
  const iface = useAppStore((s) => s.interface);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const setMobileDrawerOpen = useAppStore((s) => s.setMobileDrawerOpen);
  const navigate = useNavigate();

  const tabs = [
    { id: 'workspace', icon: '📊', label: '工作台' },
    { id: 'collab', icon: '💬', label: '协作' },
    { id: 'ai', icon: '🧠', label: 'AI' },
    { id: 'menu', icon: '📋', label: '模块' },
  ];

  function handleTab(id: string) {
    if (id === 'menu') {
      setMobileDrawerOpen(true);
    } else {
      navigate(navigateTo(id));
    }
  }

  return (
    <div role="tablist" className="flex items-center justify-around border-t border-border bg-surface h-14 shrink-0 safe-area-bottom">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => handleTab(t.id)}
          role="tab"
          aria-selected={iface === t.id}
          className={cn(
            'flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg transition-colors',
            iface === t.id && String(t.id) !== 'menu' ? 'text-primary-2' : 'text-text-3'
          )}
        >
          <span className="text-lg">{t.icon}</span>
          <span className="text-[9px] font-medium">{t.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Mobile module drawer overlay */
function MobileDrawer() {
  const mobileDrawerOpen = useAppStore((s) => s.mobileDrawerOpen);
  const setMobileDrawerOpen = useAppStore((s) => s.setMobileDrawerOpen);

  // Close on Escape
  useEffect(() => {
    if (!mobileDrawerOpen) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileDrawerOpen(false);
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileDrawerOpen, setMobileDrawerOpen]);

  if (!mobileDrawerOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setMobileDrawerOpen(false)} />
      <div role="dialog" aria-modal="true" aria-label="模块导航" className="fixed left-0 top-0 bottom-0 z-50 w-[260px] bg-surface border-r border-border shadow-2xl animate-in slide-in-from-left duration-200">
        <ModuleSidebar />
      </div>
    </>
  );
}

/** Global keyboard shortcuts hook */
function useGlobalShortcuts() {
  const navigateTo = useAppStore((s) => s.navigateTo);
  const navigate = useNavigate();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore when typing in input/textarea/select
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Ctrl+N: New task (navigate to workspace tasks)
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        navigate(navigateTo('workspace', 'tasks'));
      }
      // Ctrl+G: Quick navigation (navigate to workspace overview)
      if (e.ctrlKey && e.key === 'g') {
        e.preventDefault();
        navigate(navigateTo('workspace', 'overview'));
      }
      // Ctrl+K: Search / command palette (navigate to AI chat)
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        navigate(navigateTo('ai'));
      }
      // Ctrl+Shift+N: New goal
      if (e.ctrlKey && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        navigate(navigateTo('workspace', 'goals'));
      }
      // Ctrl+Shift+P: Quick settings (navigate to AI subscription)
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        navigate(navigateTo('ai', 'subscription'));
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigateTo, navigate]);
}

export default function App() {
  const iface = useAppStore((s) => s.interface);
  const ctxPanelOpen = useAppStore((s) => s.ctxPanelOpen);
  const indColor = useIndustryColor();
  const isMobile = useIsMobile();

  // Initialize auth state (syncs user to appStore.authUser)
  useAuth();

  const Page = PAGE_MAP[iface] ?? Workspace;

  // Global keyboard shortcuts
  useGlobalShortcuts();

  // Auto-collapse module sidebar on small screens
  useEffect(() => {
    if (window.innerWidth <= 1024) {
      const store = useAppStore.getState();
      if (store.modSidebarOpen) {
        store.toggleModSidebar();
      }
    }
  }, []);

  if (isMobile) {
    return (
      <div className="flex h-screen flex-col" style={{ '--ind-color': indColor } as CSSProperties}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-[var(--color-accent-purple)] focus:text-white focus:rounded-md focus:text-sm">跳到主要内容</a>
        <RouteSync />
        <MobileDrawer />
        <TopBar />
        <div id="main-content" role="main" className="flex-1 overflow-hidden">
          <PageErrorBoundary key={iface}>
            <Suspense fallback={<PageLoader />}>
              <Page />
            </Suspense>
          </PageErrorBoundary>
        </div>
        {ctxPanelOpen && <ContextPanel />}
        <MobileTabBar />
        <ShortcutHelp />
        <PWAInstallPrompt />
      </div>
    );
  }

  return (
    <div className="flex h-screen" style={{ '--ind-color': indColor } as CSSProperties}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-[var(--color-accent-purple)] focus:text-white focus:rounded-md focus:text-sm">跳到主要内容</a>
      <RouteSync />
      <GlobalSidebar />
      <ModuleSidebar />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <TopBar />
        <div id="main-content" role="main" className="flex-1 overflow-hidden">
          <PageErrorBoundary key={iface}>
            <Suspense fallback={<PageLoader />}>
              <Page />
            </Suspense>
          </PageErrorBoundary>
        </div>
      </div>
      {ctxPanelOpen && <ContextPanel />}
      <OnboardingOverlay />
      <OnboardingFlow />
      <ShortcutHelp />
      <PWAInstallPrompt />
    </div>
  );
}
