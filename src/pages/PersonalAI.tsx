import React, { Suspense, lazy } from 'react';
import { retryLazy } from '@/lib/retryLazy';
import { useAppStore } from '@/stores/appStore';
import ModulePageStub from '@/pages/ModulePageStub';
import { CardSkeleton } from '@/components/Skeleton';
import ModuleErrorBoundary from '@/components/ModuleErrorBoundary';

// A-grade AI modules (active, core loops)
const MainChatView = lazy(retryLazy(() => import('@/pages/MainChatView')));
const RiskView = lazy(retryLazy(() => import('@/pages/ai/RiskView')));
const AgentConfigView = lazy(retryLazy(() => import('@/pages/ai/AgentConfigView')));
const IndustryView = lazy(retryLazy(() => import('@/pages/ai/IndustryView')));
const SubscriptionView = lazy(retryLazy(() => import('@/pages/ai/SubscriptionView')));
const DSTEView = lazy(retryLazy(() => import('@/pages/ai/DSTEView')));
// C-grade AI modules FROZEN (W14): MorningView, AgentListView, WorkflowsView, KpiDashView,
// KnowledgeOSPView, MCPA2AView, TemplateWizardView, BehaviorTrackerView, UsageAlertsView, SystemMonitorView
// DEPRECATED modules removed from routes (W9):
// AgentMarketView — needs ecosystem, no value for single-user; see .temp/w8-stub-disposition.md
// CrossDeptAutomationView — duplicates AutomationContent; see .temp/w8-stub-disposition.md

// Workspace lazy imports
const CommandCenterView = lazy(retryLazy(() => import('@/pages/workspace/CommandCenterView')));

// Lazy component lookup (must be outside render to avoid re-creation)
const LAZY_MODULES: Record<string, React.LazyExoticComponent<React.FC>> = {
  main: MainChatView,
  risk: RiskView,
  agentConfig: AgentConfigView,
  industryView: IndustryView,
  subscription: SubscriptionView,
  dste: DSTEView,
  // C-grade FROZEN (W14): morning, agentList, workflows, kpiDash, knowledgeOSP,
  //   mcpA2a, behaviorTracker, templateWizard, usageAlerts, systemMonitor
};

export default function PersonalAI() {
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
