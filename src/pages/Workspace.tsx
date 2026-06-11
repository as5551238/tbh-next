import React from 'react';
import { Suspense, useEffect, lazy, type ReactNode, type LazyExoticComponent, type FC } from 'react';
import { retryLazy } from '@/lib/retryLazy';
import { useAppStore } from '@/stores/appStore';
import { useDeviationWatch } from '@/hooks/useDeviationWatch';
import { RequireRole } from '@/lib/auth';
import ModulePageStub from '@/pages/ModulePageStub';
import { CardSkeleton } from '@/components/Skeleton';
import ModuleErrorBoundary from '@/components/ModuleErrorBoundary';

const OverviewContent = lazy(retryLazy(() => import('@/pages/workspace/OverviewContent')));
const GoalsContent = lazy(retryLazy(() => import('@/pages/workspace/GoalsContent')));
const TasksContent = lazy(retryLazy(() => import('@/pages/workspace/TasksContent')));
const ProjectsContent = lazy(retryLazy(() => import('@/pages/workspace/ProjectsContent')));
const KnowledgeContent = lazy(retryLazy(() => import('@/pages/workspace/KnowledgeContent')));
const ScheduleContent = lazy(retryLazy(() => import('@/pages/workspace/ScheduleContent')));
const NotificationsContent = lazy(retryLazy(() => import('@/pages/workspace/NotificationsContent')));
const InsightContent = lazy(retryLazy(() => import('@/pages/workspace/InsightContent')));
const ReportsContent = lazy(retryLazy(() => import('@/pages/workspace/ReportsContent')));
const PredictionContent = lazy(retryLazy(() => import('@/pages/workspace/PredictionContent')));
const DocsContent = lazy(retryLazy(() => import('@/pages/workspace/DocsContent')));
const ExperienceContent = lazy(retryLazy(() => import('@/pages/workspace/ExperienceContent')));
const MembersContent = lazy(retryLazy(() => import('@/pages/workspace/MembersContent')));
const RolesContent = lazy(retryLazy(() => import('@/pages/workspace/RolesContent')));
const OrgContent = lazy(retryLazy(() => import('@/pages/workspace/OrgContent')));
const AdminContent = lazy(retryLazy(() => import('@/pages/workspace/AdminContent')));
const ReviewContent = lazy(retryLazy(() => import('@/pages/workspace/ReviewContent')));
const PenetrationView = lazy(retryLazy(() => import('@/pages/workspace/PenetrationView')));
const ActionItemsContent = lazy(retryLazy(() => import('@/pages/workspace/ActionItemsContent')));
const ActivitiesContent = lazy(retryLazy(() => import('@/pages/workspace/ActivitiesContent')));
const NotesContent = lazy(retryLazy(() => import('@/pages/workspace/NotesContent')));
const SprintsContent = lazy(retryLazy(() => import('@/pages/workspace/SprintsContent')));
const TemplatesContent = lazy(retryLazy(() => import('@/pages/workspace/TemplatesContent')));
const BookmarksContent = lazy(retryLazy(() => import('@/pages/workspace/BookmarksContent')));
const TagsContent = lazy(retryLazy(() => import('@/pages/workspace/TagsContent')));
const CategoriesContent = lazy(retryLazy(() => import('@/pages/workspace/CategoriesContent')));
// DEPRECATED modules removed from routes (W9):
// FeatureFlagsContent, SavedViewsContent, AutomationContent — see .temp/w8-stub-disposition.md
const StatusFlowContent = lazy(retryLazy(() => import('@/pages/workspace/StatusFlowContent')));
const MyWorkView = lazy(retryLazy(() => import('@/pages/MyWorkView')));
const CommandCenterView = lazy(retryLazy(() => import('@/pages/workspace/CommandCenterView')));

// Modules that require admin/owner/leader role to access
const ADMIN_ONLY_MODULES = new Set(['admin', 'roles']);

const LazyWrap = ({ children, name }: { children: ReactNode; name?: string }) => (
  <ModuleErrorBoundary moduleName={name}>
    <Suspense fallback={<CardSkeleton />}>
      {children}
    </Suspense>
  </ModuleErrorBoundary>
);

const WORKSPACE_MODULES: Record<string, LazyExoticComponent<FC>> = {
  overview: OverviewContent,
  goals: GoalsContent,
  tasks: TasksContent,
  projects: ProjectsContent,
  knowledge: KnowledgeContent,
  schedule: ScheduleContent,
  notifications: NotificationsContent,
  insight: InsightContent,
  reports: ReportsContent,
  prediction: PredictionContent,
  docs: DocsContent,
  experience: ExperienceContent,
  members: MembersContent,
  roles: RolesContent,
  org: OrgContent,
  admin: AdminContent,
  review: ReviewContent,
  alignment: PenetrationView,
  actionItems: ActionItemsContent,
  activities: ActivitiesContent,
  notes: NotesContent,
  sprints: SprintsContent,
  templates: TemplatesContent,
  bookmarks: BookmarksContent,
  tags: TagsContent,
  categories: CategoriesContent,
  statusFlow: StatusFlowContent,
  mywork: MyWorkView as LazyExoticComponent<FC>,
  commandCenter: CommandCenterView,
};

export default function Workspace() {
  const activeModule = useAppStore((s) => s.activeModule);
  const setDeviationAlertCount = useAppStore((s) => s.setDeviationAlertCount);
  const { alertCount } = useDeviationWatch();

  useEffect(() => {
    setDeviationAlertCount(alertCount);
  }, [alertCount, setDeviationAlertCount]);

  const Content = WORKSPACE_MODULES[activeModule];
  if (Content) {
    if (ADMIN_ONLY_MODULES.has(activeModule)) {
      return (
        <LazyWrap name={activeModule}>
          <RequireRole roles={['admin']}>
            <Content />
          </RequireRole>
        </LazyWrap>
      );
    }
    return <LazyWrap name={activeModule}><Content /></LazyWrap>;
  }
  return <ModulePageStub title={activeModule} icon='🚧' description='此模块正在开发中' />;
}
