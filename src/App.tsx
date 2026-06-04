import { lazy, Suspense, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import { useIndustryColor, useDepartments } from '@/hooks/useMatrix';
import { useIsMobile } from '@/hooks/useIsMobile';
import GlobalSidebar from '@/components/GlobalSidebar';
import ModuleSidebar from '@/components/ModuleSidebar';
import TopBar from '@/components/TopBar';
import ContextPanel from '@/components/ContextPanel';
import PageErrorBoundary from '@/components/PageErrorBoundary';
import { cn } from '@/lib/utils';

const Workspace = lazy(() => import('@/pages/Workspace'));
const Collab = lazy(() => import('@/pages/Collab'));
const PersonalAI = lazy(() => import('@/pages/PersonalAI'));

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

const PAGE_MAP: Record<string, React.LazyExoticComponent<() => JSX.Element>> = {
  workspace: Workspace,
  collab: Collab,
  ai: PersonalAI,
};

/** Sync URL → zustand store (interface + module from path) */
function RouteSync() {
  const location = useLocation();
  const setInterface = useAppStore((s) => s.setInterface);
  const setActiveModule = useAppStore((s) => s.setActiveModule);

  useEffect(() => {
    const segments = location.pathname.split('/').filter(Boolean);
    if (segments[0] && ['workspace', 'collab', 'ai'].includes(segments[0])) {
      setInterface(segments[0]);
    }
    if (segments[1]) {
      setActiveModule(segments[1]);
    }
  }, [location.pathname, setInterface, setActiveModule]);

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
  const setInterface = useAppStore((s) => s.setInterface);
  const setActiveModule = useAppStore((s) => s.setActiveModule);
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
      setInterface(id);
      setActiveModule('overview');
      navigate(`/${id}/overview`);
    }
  }

  return (
    <div className="flex items-center justify-around border-t border-border bg-surface h-14 shrink-0 safe-area-bottom">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => handleTab(t.id)}
          className={cn(
            'flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg transition-colors',
            iface === t.id && t.id !== 'menu' ? 'text-primary-2' : 'text-text-3'
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

  if (!mobileDrawerOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setMobileDrawerOpen(false)} />
      <div className="fixed left-0 top-0 bottom-0 z-50 w-[260px] bg-surface border-r border-border shadow-2xl animate-in slide-in-from-left duration-200">
        <ModuleSidebar />
      </div>
    </>
  );
}

export default function App() {
  const iface = useAppStore((s) => s.interface);
  const ctxPanelOpen = useAppStore((s) => s.ctxPanelOpen);
  const indColor = useIndustryColor();
  const isMobile = useIsMobile();

  const Page = PAGE_MAP[iface] ?? Workspace;

  // Auto-collapse module sidebar on mobile
  useEffect(() => {
    if (isMobile) {
      useAppStore.getState().toggleModSidebar();
    }
  }, []);

  if (isMobile) {
    return (
      <div className="flex h-screen flex-col" style={{ '--ind-color': indColor } as React.CSSProperties}>
        <RouteSync />
        <MobileDrawer />
        <TopBar />
        <div className="flex-1 overflow-hidden">
          <PageErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Page />
            </Suspense>
          </PageErrorBoundary>
        </div>
        {ctxPanelOpen && <ContextPanel />}
        <MobileTabBar />
      </div>
    );
  }

  return (
    <div className="flex h-screen" style={{ '--ind-color': indColor } as React.CSSProperties}>
      <RouteSync />
      <GlobalSidebar />
      <ModuleSidebar />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <TopBar />
        <div className="flex-1 overflow-hidden">
          <PageErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Page />
            </Suspense>
          </PageErrorBoundary>
        </div>
      </div>
      {ctxPanelOpen && <ContextPanel />}
    </div>
  );
}
