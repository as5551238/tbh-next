import { useAppStore } from '@/stores/appStore';
import { CardSkeleton } from '@/components/Skeleton';
import { useGateCheck } from '@/hooks/useGateCheck';
import PaywallModal from '@/components/PaywallModal';
import { REVIEW_MODELS } from '@/lib/reviewEngine';
import { useGoals, useTasks } from '@/hooks/useMatrix';
import { useReviewAlerts } from './review/useReviewAlerts';
import { useReviewDraft } from './review/useReviewDraft';
import { ReviewAlertsPhase } from './review/ReviewAlertsPhase';
import { ReviewPickPhase } from './review/ReviewPickPhase';
import { ReviewGuidePhase } from './review/ReviewGuidePhase';
import { ReviewDraftPhase } from './review/ReviewDraftPhase';
import { ReviewDonePhase } from './review/ReviewDonePhase';

export default function ReviewContent() {
  const { showPaywall: rvShow, paywallReason: rvReason, paywallFeature: rvFeat, closePaywall: rvClose } = useGateCheck();
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);
  const { goals, loading: goalsLoading } = useGoals();
  const { tasks } = useTasks();

  const { alerts, persistedAlerts, autoProgressMap, computeAlerts, markAlertRead } = useReviewAlerts(goals, tasks, goalsLoading);
  const {
    phase, selectedModel, selectedAlert, setSelectedAlert,
    session, isGenerating, isSavingActions, actionItems,
    recentSessions,
    startReview, pickModel, handleStepInput, nextStep, prevStep, generateDraft,
    completeReview, toggleActionItem, convertToTask, resetReview,
    resumeSession,
  } = useReviewDraft(industry, dept, goals, tasks);

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
          recentSessions={recentSessions}
          onStartTimeReview={startReview}
          onComputeAlerts={computeAlerts}
          onMarkRead={markAlertRead}
          onManualStart={(modelId) => {
            const model = REVIEW_MODELS.find((m) => m.id === modelId) ?? REVIEW_MODELS[0];
            setSelectedAlert(null);
            pickModel(model);
          }}
          onResumeSession={resumeSession}
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
          onSkipToDraft={() => generateDraft()}
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
          goals={goals.map(g => ({ ...g, end_date: g.end_date ?? undefined }))}
          tasks={tasks.map(t => ({ ...t, goal_id: t.goal_id ?? undefined, due_date: t.due_date ?? undefined, completed_at: t.completed_at ?? undefined }))}
          onToggleActionItem={toggleActionItem}
          onConvertToTask={convertToTask}
          onReset={resetReview}
          paywallSlot={paywallSlot}
        />
      );
  }
}
