import { lazy, Suspense, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import { useIndustryColor } from '@/hooks/useMatrix';
import GlobalSidebar from '@/components/GlobalSidebar';
import ModuleSidebar from '@/components/ModuleSidebar';
import TopBar from '@/components/TopBar';
import ContextPanel from '@/components/ContextPanel';
import PageErrorBoundary from '@/components/PageErrorBoundary';

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

export default function App() {
  const iface = useAppStore((s) => s.interface);
  const ctxPanelOpen = useAppStore((s) => s.ctxPanelOpen);
  const indColor = useIndustryColor();

  const Page = PAGE_MAP[iface] ?? Workspace;

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
