import { AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { ActionItemRow } from '@/lib/dataLayer';

interface ChatContextBarProps {
  overdueTasks: { length: number };
  atRiskGoals: { length: number };
  deviationAlerts: { length: number };
  openActionItems: { length: number };
  onNavTo: (iface: string, module: string) => void;
  isTyping: boolean;
}

export function ChatContextBar({ overdueTasks, atRiskGoals, deviationAlerts, openActionItems, onNavTo, isTyping }: ChatContextBarProps) {
  if (overdueTasks.length === 0 && atRiskGoals.length === 0 && openActionItems.length === 0 && deviationAlerts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 px-4 py-1.5 border-t border-border bg-danger/5">
      {overdueTasks.length > 0 && (
        <button onClick={() => onNavTo('workspace', 'tasks')} className="flex flex-wrap items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-[10px] text-danger hover:bg-danger/20 transition-colors" disabled={isTyping}>
          <AlertTriangle size={10} />{overdueTasks.length}个逾期任务
        </button>
      )}
      {atRiskGoals.length > 0 && (
        <button onClick={() => onNavTo('workspace', 'goals')} className="flex flex-wrap items-center gap-1 rounded-full bg-warn/10 px-2 py-0.5 text-[10px] text-warn hover:bg-warn/20 transition-colors" disabled={isTyping}>
          <ShieldAlert size={10} />{atRiskGoals.length}个风险目标
        </button>
      )}
      {deviationAlerts.length > 0 && (
        <button onClick={() => onNavTo('ai', 'risk')} className="flex flex-wrap items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-[10px] text-danger hover:bg-danger/20 transition-colors" disabled={isTyping}>
          <AlertTriangle size={10} />{deviationAlerts.length}个偏差告警
        </button>
      )}
      {openActionItems.length > 0 && (
        <button onClick={() => onNavTo('workspace', 'actionItems')} className="flex flex-wrap items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary-2 hover:bg-primary/20 transition-colors" disabled={isTyping}>
          <CheckCircle2 size={10} />{openActionItems.length}个待办行动项
        </button>
      )}
    </div>
  );
}
