import React from 'react';
import { Suspense, useEffect, lazy, type ReactNode, type LazyExoticComponent, type FC } from 'react';
import { retryLazy } from '@/lib/retryLazy';
import { useAppStore } from '@/stores/appStore';
import { useDeviationWatch } from '@/hooks/useDeviationWatch';
import { RequireRole } from '@/lib/auth';
import ModulePageStub from '@/pages/ModulePageStub';
import { CardSkeleton } from '@/components/Skeleton';
import ModuleErrorBoundary from '@/components/ModuleErrorBoundary';

// A-grade modules (active, core loops)
const OverviewContent = lazy(retryLazy(() => import('@/pages/workspace/OverviewContent')));
const GoalsContent = lazy(retryLazy(() => import('@/pages/workspace/GoalsContent')));
const TasksContent = lazy(retryLazy(() => import('@/pages/workspace/TasksContent')));
const ProjectsContent = lazy(retryLazy(() => import('@/pages/workspace/ProjectsContent')));
const KnowledgeContent = lazy(retryLazy(() => import('@/pages/workspace/KnowledgeContent')));
const ScheduleContent = lazy(retryLazy(() => import('@/pages/workspace/ScheduleContent')));
const NotificationsContent = lazy(retryLazy(() => import('@/pages/workspace/NotificationsContent')));
const ReportsContent = lazy(retryLazy(() => import('@/pages/workspace/ReportsContent')));
const MembersContent = lazy(retryLazy(() => import('@/pages/workspace/MembersContent')));
const OrgContent = lazy(retryLazy(() => import('@/pages/workspace/OrgContent')));
const AdminContent = lazy(retryLazy(() => import('@/pages/workspace/AdminContent')));
const ReviewContent = lazy(retryLazy(() => import('@/pages/workspace/ReviewContent')));
const ActionItemsContent = lazy(retryLazy(() => import('@/pages/workspace/ActionItemsContent')));
const TagsContent = lazy(retryLazy(() => import('@/pages/workspace/TagsContent')));
const MyWorkView = lazy(retryLazy(() => import('@/pages/MyWorkView')));
const CommandCenterView = lazy(retryLazy(() => import('@/pages/workspace/CommandCenterView')));
// B-grade modules (kept for M2 close-out)
const InsightContent = lazy(retryLazy(() => import('@/pages/workspace/InsightContent')));
// C-grade modules FROZEN (W14): PredictionContent, DocsContent, ExperienceContent, RolesContent,
// ActivitiesContent, NotesContent, SprintsContent, TemplatesContent, BookmarksContent,
// CategoriesContent, StatusFlowContent, PenetrationView
// DEPRECATED modules removed from routes (W9):
// FeatureFlagsContent, SavedViewsContent, AutomationContent — see .temp/w8-stub-disposition.md

// Modules that require admin/owner/leader role to access
const ADMIN_ONLY_MODULES = new Set(['admin', 'org']);

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
  members: MembersContent,
  org: OrgContent,
  admin: AdminContent,
  review: ReviewContent,
  actionItems: ActionItemsContent,
  tags: TagsContent,
  mywork: MyWorkView as LazyExoticComponent<FC>,
  commandCenter: CommandCenterView,
  // C-grade FROZEN (W14): prediction, docs, experience, roles, alignment,
  //   activities, notes, sprints, templates, bookmarks, categories, statusFlow
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
