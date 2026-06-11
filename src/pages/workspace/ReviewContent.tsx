import { useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';
import { CardSkeleton } from '@/components/Skeleton';
import { useGateCheck } from '@/hooks/useGateCheck';
import PaywallModal from '@/components/PaywallModal';
import { hasFeature } from '@/lib/subscription';
import { REVIEW_MODELS } from '@/lib/reviewEngine';
import { useGoals, useTasks } from '@/hooks/useMatrix';
import { useReviewAlerts } from './review/useReviewAlerts';
import { useReviewDraft } from './review/useReviewDraft';
import { ReviewAlertsPhase } from './review/ReviewAlertsPhase';
import { ReviewPickPhase } from './review/ReviewPickPhase';
import { ReviewGuidePhase } from './review/ReviewGuidePhase';
import { ReviewDraftPhase } from './review/ReviewDraftPhase';
import { ReviewDonePhase } from './review/ReviewDonePhase';
import { useEffect } from 'react';

const PRO_FEATURES = {
  deepReview: hasFeature('customWorkflows' as never),
  customReport: hasFeature('advancedAnalytics' as never),
  automation: hasFeature('customWorkflows' as never),
  prediction: hasFeature('advancedAnalytics' as never),
  statusFlow: hasFeature('customWorkflows' as never),
  knowledge: hasFeature('advancedAnalytics' as never),
  aiQuery: hasFeature('advancedAnalytics' as never),
};

export default function ReviewContent() {
  const { showPaywall: rvShow, paywallReason: rvReason, paywallFeature: rvFeat, closePaywall: rvClose, requireFeature: rvRequire } = useGateCheck();
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);
  const { goals, loading: goalsLoading } = useGoals();
  const { tasks } = useTasks();

  const { alerts, persistedAlerts, autoProgressMap, computeAlerts, markAlertRead } = useReviewAlerts(goals, tasks, goalsLoading);
  const {
    phase, selectedModel, selectedAlert, setSelectedAlert, setSelectedModel,
    session, isGenerating, isSavingActions, actionItems,
    startReview, pickModel, handleStepInput, nextStep, prevStep, generateDraft,
    completeReview, loadActionItems, toggleActionItem, convertToTask, resetReview,
  } = useReviewDraft(industry, dept, goals, tasks);

  // Load action items on mount
  useEffect(() => { loadActionItems(); }, [loadActionItems]);

  const paywallSlot = <PaywallModal open={rvShow} onClose={rvClose} reason={rvReason} feature={rvFeat} />;

  if (goalsLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  const apm = autoProgressMap();

  switch (phase) {
    case 'alerts':
      return (
        <ReviewAlertsPhase
          alerts={alerts}
          persistedAlerts={persistedAlerts}
          autoProgressMap={apm}
          goals={goals}
          onStartReview={startReview}
          onComputeAlerts={computeAlerts}
          onMarkRead={markAlertRead}
          onManualStart={(modelId) => {
            const model = REVIEW_MODELS.find((m) => m.id === modelId) ?? REVIEW_MODELS[0];
            setSelectedAlert(null);
            setSelectedModel(model);
            pickModel(model);
          }}
          requireFeature={rvRequire}
          paywallSlot={paywallSlot}
        />
      );
    case 'pick':
      return (
        <ReviewPickPhase
          selectedAlert={selectedAlert}
          onPickModel={pickModel}
          onBack={() => resetReview()}
          paywallSlot={paywallSlot}
        />
      );
    case 'guide':
      return session && selectedModel ? (
        <ReviewGuidePhase
          session={session}
          selectedModel={selectedModel}
          isGenerating={isGenerating}
          onStepInput={handleStepInput}
          onNextStep={nextStep}
          onPrevStep={prevStep}
          onGenerateDraft={generateDraft}
          onSkipToDraft={() => { if (!rvRequire('customWorkflows', 'AI复盘生成需要专业版或企业版')) return; generateDraft(); }}
          onBack={() => resetReview()}
          paywallSlot={paywallSlot}
        />
      ) : null;
    case 'draft':
      return session ? (
        <ReviewDraftPhase
          session={session}
          isGenerating={isGenerating}
          isSavingActions={isSavingActions}
          onComplete={completeReview}
          onBack={() => {}}
          onRegenerate={generateDraft}
          paywallSlot={paywallSlot}
        />
      ) : null;
    case 'done':
      return (
        <ReviewDonePhase
          session={session}
          selectedAlert={selectedAlert}
          selectedModelId={selectedModel?.id ?? null}
          actionItems={actionItems}
          persistedAlerts={persistedAlerts}
          goals={goals}
          tasks={tasks}
          onToggleActionItem={toggleActionItem}
          onConvertToTask={convertToTask}
          onReset={resetReview}
          paywallSlot={paywallSlot}
        />
      );
  }
}
