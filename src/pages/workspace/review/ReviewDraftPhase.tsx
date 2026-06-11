import { Loader2, Sparkles } from 'lucide-react';
import { Lightbulb } from 'lucide-react';
import { btnPrimary, btnSecondary } from '@/components/Modal';
import type { ReviewSession } from '@/lib/reviewEngine';

interface DraftPhaseProps {
  session: ReviewSession;
  isGenerating: boolean;
  isSavingActions: boolean;
  onComplete: () => void;
  onBack: () => void;
  onRegenerate: () => void;
  paywallSlot: React.ReactNode;
}

export function ReviewDraftPhase({
  session, isGenerating, isSavingActions, onComplete, onBack, onRegenerate, paywallSlot,
}: DraftPhaseProps) {
  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={onBack} className="text-text-3 hover:text-text">&larr; 返回编辑</button>
        <span className="text-sm font-bold">复盘报告</span>
        <span className="rounded-full bg-success/10 px-2 py-0.5 text-[9px] font-bold text-success">草稿已生成</span>
      </div>

      {/* Draft Content */}
      <div className="rounded-xl border border-border bg-surface p-3 md:p-4">
        <div className="prose prose-sm prose-invert max-w-none">
          {session.draft.split('\n').map((line, i) => {
            if (line.startsWith('# ')) return <h2 key={i} className="text-base font-bold text-text mt-3 mb-1">{line.slice(2)}</h2>;
            if (line.startsWith('## ')) return <h3 key={i} className="text-sm font-bold text-text mt-2 mb-1">{line.slice(3)}</h3>;
            if (line.startsWith('- [ ] ')) return <div key={i} className="flex flex-wrap items-center gap-2 text-xs text-primary-2"><Lightbulb size={11} />{line.slice(6)}</div>;
            if (line.startsWith('- ')) return <div key={i} className="text-xs text-text-2 ml-3">• {line.slice(2)}</div>;
            if (line.trim() === '') return <div key={i} className="h-2" />;
            return <div key={i} className="text-xs text-text-2 leading-relaxed">{line}</div>;
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={onComplete} className={btnPrimary} disabled={isSavingActions}>
          {isSavingActions ? <Loader2 size={12} className="animate-spin mr-1" /> : null}
          完成复盘并生成行动项
        </button>
        <button onClick={onBack} className={btnSecondary}>继续编辑</button>
        <button onClick={onRegenerate} className={`${btnSecondary} flex items-center gap-1.5`}>
          <Sparkles size={12} /> 重新AI生成
        </button>
      </div>

      {paywallSlot}
    </div>
  );
}
