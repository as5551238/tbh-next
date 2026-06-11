import { Loader2, Sparkles } from 'lucide-react';
import { btnPrimary, btnSecondary } from '@/components/Modal';
import type { ReviewModel, ReviewSession } from '@/lib/reviewEngine';

interface GuidePhaseProps {
  session: ReviewSession;
  selectedModel: ReviewModel;
  isGenerating: boolean;
  onStepInput: (stepId: string, value: string) => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onGenerateDraft: () => void;
  onSkipToDraft: () => void;
  onBack: () => void;
  paywallSlot: React.ReactNode;
}

export function ReviewGuidePhase({
  session, selectedModel, isGenerating,
  onStepInput, onNextStep, onPrevStep, onGenerateDraft, onSkipToDraft, onBack, paywallSlot,
}: GuidePhaseProps) {
  const step = selectedModel.steps[session.currentStep];
  const totalSteps = selectedModel.steps.length;
  const allFilled = selectedModel.steps.filter((s) => s.required).every((s) => session.inputs[s.id]?.trim());

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={onBack} className="text-text-3 hover:text-text">&larr; 返回</button>
        <span className="text-sm font-bold">{selectedModel.icon} {selectedModel.name}</span>
      </div>

      {/* Progress bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((session.currentStep + 1) / totalSteps) * 100}%` }} />
        </div>
        <span className="text-[10px] text-text-3">{session.currentStep + 1}/{totalSteps}</span>
      </div>

      {/* Target */}
      <div className="rounded-lg bg-surface-2 px-3 py-2 text-[10px] text-text-3">
        复盘对象：<span className="font-medium text-text">{session.targetTitle}</span>
      </div>

      {/* Current Step */}
      <div className="rounded-xl border border-border bg-surface p-3 md:p-4">
        <div className="text-sm font-bold text-text mb-2">{step.title}</div>
        <div className="text-xs text-text-2 mb-3">{step.prompt}</div>
        <textarea
          value={session.inputs[step.id] ?? ''}
          onChange={(e) => onStepInput(step.id, e.target.value)}
          placeholder={step.placeholder}
          rows={4}
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-text outline-none placeholder:text-text-3 focus:border-primary/50 resize-none"
        />
      </div>

      {/* Step Navigator */}
      <div className="flex flex-wrap items-center gap-2">
        {session.currentStep > 0 && (
          <button onClick={onPrevStep} className={btnSecondary}>上一步</button>
        )}
        <div className="flex-1" />
        {session.currentStep < totalSteps - 1 ? (
          <button
            onClick={onNextStep}
            disabled={step.required && !session.inputs[step.id]?.trim()}
            className={`${btnPrimary} disabled:opacity-40`}
          >
            下一步
          </button>
        ) : (
          <button
            onClick={onGenerateDraft}
            disabled={isGenerating || !allFilled}
            className={`${btnPrimary} flex items-center gap-1.5 disabled:opacity-40`}
          >
            {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {isGenerating ? '生成中...' : 'AI 生成复盘报告'}
          </button>
        )}
      </div>

      {/* Quick-fill all steps */}
      <button
        onClick={onSkipToDraft}
        disabled={isGenerating}
        className="w-full rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-2 text-[10px] text-primary-2 hover:bg-primary/10 transition-colors disabled:opacity-40"
      >
        {isGenerating ? 'AI正在分析...' : '跳过手动填写，AI一键生成复盘草稿 →'}
      </button>

      {paywallSlot}
    </div>
  );
}
