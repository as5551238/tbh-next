import React, { Suspense, lazy } from 'react';
import { retryLazy } from '@/lib/retryLazy';
import { useAppStore } from '@/stores/appStore';
import ModulePageStub from '@/pages/ModulePageStub';
import { CardSkeleton } from '@/components/Skeleton';

const MainChatView = lazy(retryLazy(() => import('@/pages/MainChatView')));
const MorningView = lazy(retryLazy(() => import('@/pages/ai/MorningView')));
const RiskView = lazy(retryLazy(() => import('@/pages/ai/RiskView')));
const AgentListView = lazy(retryLazy(() => import('@/pages/ai/AgentListView')));
const AgentConfigView = lazy(retryLazy(() => import('@/pages/ai/AgentConfigView')));
const IndustryView = lazy(retryLazy(() => import('@/pages/ai/IndustryView')));
const WorkflowsView = lazy(retryLazy(() => import('@/pages/ai/WorkflowsView')));
const KpiDashView = lazy(retryLazy(() => import('@/pages/ai/KpiDashView')));
const SubscriptionView = lazy(retryLazy(() => import('@/pages/ai/SubscriptionView')));
const AgentMarketView = lazy(retryLazy(() => import('@/pages/ai/AgentMarketView')));
const KnowledgeOSPView = lazy(retryLazy(() => import('@/pages/ai/KnowledgeOSPView')));
const MCPA2AView = lazy(retryLazy(() => import('@/pages/ai/MCPA2AView')));
const BehaviorTrackerView = lazy(retryLazy(() => import('@/pages/ai/BehaviorTrackerView')));
const DSTEView = lazy(retryLazy(() => import('@/pages/ai/DSTEView')));
const TemplateWizardView = lazy(retryLazy(() => import('@/pages/ai/TemplateWizardView')));
const CrossDeptAutomationView = lazy(retryLazy(() => import('@/pages/ai/CrossDeptAutomationView')));
const UsageAlertsView = lazy(retryLazy(() => import('@/pages/ai/UsageAlertsView')));

// Workspace lazy imports
const CommandCenterView = lazy(retryLazy(() => import('@/pages/workspace/CommandCenterView')));

// Lazy component lookup (must be outside render to avoid re-creation)
const LAZY_MODULES: Record<string, React.LazyExoticComponent<React.FC>> = {
  main: MainChatView,
  morning: MorningView,
  risk: RiskView,
  agentList: AgentListView,
  agentConfig: AgentConfigView,
  industryView: IndustryView,
  workflows: WorkflowsView,
  kpiDash: KpiDashView,
  subscription: SubscriptionView,
  agentMarket: AgentMarketView,
  knowledgeOSP: KnowledgeOSPView,
  mcpA2a: MCPA2AView,
  behaviorTracker: BehaviorTrackerView,
  dste: DSTEView,
  templateWizard: TemplateWizardView,
  crossDeptAutomation: CrossDeptAutomationView,
  usageAlerts: UsageAlertsView,
};

export default function PersonalAI() {
  const activeModule = useAppStore((s) => s.activeModule);
  const LazyComponent = LAZY_MODULES[activeModule];

  if (LazyComponent) {
    return (
      <Suspense fallback={<CardSkeleton />}>
        <LazyComponent />
      </Suspense>
    );
  }

  return <ModulePageStub title={activeModule} icon='🚧' description='此模块正在开发中' />;
}
