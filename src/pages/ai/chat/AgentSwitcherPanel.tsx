import { Zap, TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';
import { ALL_AGENTS, type AgentDef } from '@/lib/agents';
import { cn } from '@/lib/utils';

const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus };

interface AgentSwitcherPanelProps {
  activeAgent: AgentDef | null;
  onSelectAgent: (agent: AgentDef) => void;
  cell: {
    kpis: Array<{ name: string; value: string; status: string; trend: 'up' | 'down' | 'flat'; target: string }>;
    workflow: string[];
    wfCurrent: number;
    top3: Array<{ level: string; text: string }>;
  };
  indColor: string;
  industry: string;
  dept: string;
}

export function AgentSwitcherPanel({ activeAgent, onSelectAgent, cell, indColor, industry, dept }: AgentSwitcherPanelProps) {
  return (
    <div className="flex w-full md:w-[320px] lg:w-[380px] shrink-0 flex-col overflow-y-auto">
      {/* Agent switcher */}
      <div className="border-b border-border p-3 md:p-4">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-3">AI 同事</div>
        <div className="space-y-2">
          {ALL_AGENTS.map((agent) => (
            <button key={agent.id} onClick={() => onSelectAgent(agent)} className={cn( 'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-all', activeAgent?.id === agent.id ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-surface-2 hover:bg-surface-3' )}>
              <div className="flex h-7 w-7 items-center justify-center rounded-full shrink-0" style={{ backgroundColor: agent.color + '15' }}>
                <span className="text-sm">{agent.icon}</span>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-text">{agent.name}</div>
                <div className="text-[9px] text-text-3">{agent.description}</div>
              </div>
              <Zap size={12} className="ml-auto shrink-0" style={{ color: agent.color, opacity: activeAgent?.id === agent.id ? 1 : 0.3 }} />
            </button>
          ))}
        </div>
      </div>

      {/* KPI summary */}
      <div className="border-b border-border p-3 md:p-4">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-3">实时指标</div>
        <div className="space-y-2">
          {cell.kpis.map((kpi) => { const TI = TREND_ICON[kpi.trend]; return (
            <div key={kpi.name} className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2">
              <div className="min-w-0"><div className="text-[10px] text-text-3">{kpi.name}</div><div className={cn('text-sm font-bold', kpi.status === 'good' ? 'text-success' : kpi.status === 'warn' ? 'text-warn' : 'text-danger')}>{kpi.value}</div></div>
              <div className="flex flex-col items-end gap-0.5"><TI size={13} className={kpi.status === 'good' ? 'text-success' : kpi.status === 'warn' ? 'text-warn' : 'text-danger'} /><span className="text-[9px] text-text-3">{kpi.target}</span></div>
            </div>
          ); })}
        </div>
      </div>

      {/* Workflow */}
      <div className="border-b border-border p-3 md:p-4">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-3">工作流</div>
        <div className="flex flex-wrap gap-1.5">
          {cell.workflow.map((step, i) => (
            <div key={step} className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]', i === cell.wfCurrent && 'bg-accent/15 font-semibold text-accent', i < cell.wfCurrent && 'bg-success/10 text-success', i > cell.wfCurrent && 'bg-surface-2 text-text-3')}>
              <span>{step}</span>{i < cell.workflow.length - 1 && <ChevronRight size={10} className="text-text-3" />}
            </div>
          ))}
        </div>
      </div>

      {/* Top 3 alerts */}
      <div className="p-3 md:p-4">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-3">重点预警</div>
        <div className="space-y-1.5">
          {cell.top3.map((item, i) => (
            <div key={i} className={cn('flex items-start gap-2 rounded-lg px-3 py-2 text-[11px]', item.level === 'danger' && 'bg-danger/5 text-danger', item.level === 'warn' && 'bg-warn/5 text-warn', item.level === 'info' && 'bg-primary/5 text-primary-2')}>
              <span className="shrink-0">{item.level === 'danger' ? '🔴' : item.level === 'warn' ? '⚠️' : 'ℹ️'}</span><span className="leading-relaxed">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
