import React, { Suspense, lazy } from 'react';
import { retryLazy } from '@/lib/retryLazy';
import { useAppStore } from '@/stores/appStore';
import ModulePageStub from '@/pages/ModulePageStub';
import { CardSkeleton } from '@/components/Skeleton';
import ModuleErrorBoundary from '@/components/ModuleErrorBoundary';

const ChannelsView = lazy(retryLazy(() => import('@/pages/collab/ChannelsView')));
const ApprovalsView = lazy(retryLazy(() => import('@/pages/collab/ApprovalsView')));
const AnnouncementsView = lazy(retryLazy(() => import('@/pages/collab/AnnouncementsView')));
const TeamCalView = lazy(retryLazy(() => import('@/pages/collab/TeamCalView')));
const CollabDocsView = lazy(retryLazy(() => import('@/pages/collab/CollabDocsView')));
const MeetingsView = lazy(retryLazy(() => import('@/pages/collab/MeetingsView')));
const FilesView = lazy(retryLazy(() => import('@/pages/collab/FilesView')));
const DirectoryView = lazy(retryLazy(() => import('@/pages/collab/DirectoryView')));
const AiAgentsView = lazy(retryLazy(() => import('@/pages/collab/AiAgentsView')));

// Lazy component lookup (must be outside render to avoid re-creation)
const LAZY_MODULES: Record<string, React.LazyExoticComponent<React.FC>> = {
  channels: ChannelsView,
  teamCal: TeamCalView,
  approvals: ApprovalsView,
  announcements: AnnouncementsView,
  collabDocs: CollabDocsView,
  meetings: MeetingsView,
  files: FilesView,
  directory: DirectoryView,
  aiAgents: AiAgentsView,
};

export default function Collab() {
  const activeModule = useAppStore((s) => s.activeModule);
  const LazyComponent = LAZY_MODULES[activeModule];

  if (LazyComponent) {
    return (
      <ModuleErrorBoundary moduleName={activeModule}>
        <Suspense fallback={<CardSkeleton />}>
          <LazyComponent />
        </Suspense>
      </ModuleErrorBoundary>
    );
  }

  return <ModulePageStub title={activeModule} icon='🚧' description='此模块正在开发中' />;
}
