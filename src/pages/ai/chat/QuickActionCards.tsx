import { Target, ListTodo, CheckCircle2, ShieldAlert, PlusCircle, Brain, TrendingUp, Zap } from 'lucide-react';

interface QuickActionCardsProps {
  onToolAction: (toolName: string, args: Record<string, unknown>, label: string, navModule?: string, navIface?: string) => void;
  onNavTo: (iface: string, module: string) => void;
  onSetInput: (text: string) => void;
  isTyping: boolean;
}

export function QuickActionCards({ onToolAction, onNavTo, onSetInput, isTyping }: QuickActionCardsProps) {
  return (
    <div className="grid grid-cols-4 gap-1.5 px-4 py-2 border-t border-border">
      <button onClick={() => onToolAction('get_goals', {}, '正在获取目标...', 'goals', 'workspace')} className="flex flex-col items-center gap-1 rounded-lg border border-border p-2 transition-all hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50" disabled={isTyping}>
        <Target size={14} className="text-primary-2" /><span className="text-[9px] text-text-3">查看目标</span>
      </button>
      <button onClick={() => onToolAction('get_tasks', {}, '正在获取任务...', 'tasks', 'workspace')} className="flex flex-col items-center gap-1 rounded-lg border border-border p-2 transition-all hover:border-success/50 hover:bg-success/5 disabled:opacity-50" disabled={isTyping}>
        <ListTodo size={14} className="text-success" /><span className="text-[9px] text-text-3">我的任务</span>
      </button>
      <button onClick={() => onToolAction('get_action_items', { status: 'open' }, '正在获取行动项...', 'actionItems', 'workspace')} className="flex flex-col items-center gap-1 rounded-lg border border-border p-2 transition-all hover:border-warn/50 hover:bg-warn/5 disabled:opacity-50" disabled={isTyping}>
        <CheckCircle2 size={14} className="text-warn" /><span className="text-[9px] text-text-3">行动项</span>
      </button>
      <button onClick={() => onNavTo('ai', 'risk')} className="flex flex-col items-center gap-1 rounded-lg border border-border p-2 transition-all hover:border-danger/50 hover:bg-danger/5 disabled:opacity-50" disabled={isTyping}>
        <ShieldAlert size={14} className="text-danger" /><span className="text-[9px] text-text-3">风险检查</span>
      </button>
      <button onClick={() => !isTyping && onSetInput('帮我创建一个新任务：')} className="flex flex-col items-center gap-1 rounded-lg border border-border p-2 transition-all hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50" disabled={isTyping}>
        <PlusCircle size={14} className="text-primary-2" /><span className="text-[9px] text-text-3">创建任务</span>
      </button>
      <button onClick={() => onNavTo('workspace', 'overview')} className="flex flex-col items-center gap-1 rounded-lg border border-border p-2 transition-all hover:border-accent/50 hover:bg-accent/5 disabled:opacity-50" disabled={isTyping}>
        <Brain size={14} className="text-accent" /><span className="text-[9px] text-text-3">今日聚焦</span>
      </button>
      <button onClick={() => onNavTo('ai', 'kpiDash')} className="flex flex-col items-center gap-1 rounded-lg border border-border p-2 transition-all hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50" disabled={isTyping}>
        <TrendingUp size={14} className="text-primary-2" /><span className="text-[9px] text-text-3">KPI看板</span>
      </button>
      <button onClick={() => onNavTo('workspace', 'review')} className="flex flex-col items-center gap-1 rounded-lg border border-border p-2 transition-all hover:border-success/50 hover:bg-success/5 disabled:opacity-50" disabled={isTyping}>
        <Zap size={14} className="text-success" /><span className="text-[9px] text-text-3">发起复盘</span>
      </button>
    </div>
  );
}
