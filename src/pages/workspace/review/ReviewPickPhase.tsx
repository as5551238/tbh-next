import { ChevronRight } from 'lucide-react';
import { REVIEW_MODELS, recommendModels, type ReviewModel, type DeviationAlert } from '@/lib/reviewEngine';

interface PickPhaseProps {
  selectedAlert: DeviationAlert | null;
  onPickModel: (model: ReviewModel) => void;
  onBack: () => void;
  paywallSlot: React.ReactNode;
}

export function ReviewPickPhase({ selectedAlert, onPickModel, onBack, paywallSlot }: PickPhaseProps) {
  const ctx = selectedAlert ? {
    targetTitle: selectedAlert.targetTitle,
    targetType: selectedAlert.targetType,
    progress: selectedAlert.progress,
    status: 'active' as const,
    deviationPercent: selectedAlert.deviationPercent,
    tags: [] as string[],
    daysRemaining: 0,
    isOverdue: selectedAlert.isOverdue,
  } : null;
  const recs = ctx ? recommendModels(ctx) : REVIEW_MODELS.map((m) => ({ model: m, score: 50, reason: '' }));
  const target = selectedAlert?.targetTitle ?? '手动复盘';

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={onBack} className="text-text-3 hover:text-text">&larr; 返回</button>
        <span className="text-sm font-bold">选择复盘框架</span>
      </div>
      <div className="text-xs text-text-2">复盘对象：<span className="font-semibold text-text">{target}</span></div>
      <div className="space-y-2">
        {recs.map((r) => (
          <button key={r.model.id} onClick={() => onPickModel(r.model)}
            className="w-full rounded-xl border border-border bg-surface p-3 md:p-4 text-left transition-all hover:border-primary/50 hover:shadow-lg">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-2xl">{r.model.icon}</span>
              <div className="flex-1">
                <div className="text-sm font-bold text-text">{r.model.name}</div>
                <div className="text-[10px] text-text-3">{r.model.description}</div>
                {r.reason && <div className="mt-1 rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-medium text-primary-2 inline-block">AI推荐：{r.reason}</div>}
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-primary-2">{r.score}</div>
                <div className="text-[8px] text-text-3">匹配度</div>
              </div>
              <ChevronRight size={16} className="text-text-3" />
            </div>
          </button>
        ))}
      </div>
      {paywallSlot}
    </div>
  );
}
