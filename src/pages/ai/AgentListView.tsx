import { useAgentDetails, useIndustryColor } from '@/hooks/useMatrix';
import { cn } from '@/lib/utils';
import { Bot, ToggleLeft, ToggleRight, BarChart3, Cpu, Zap, Loader2 } from 'lucide-react';

const STATUS_DOT: Record<string, string> = { running: 'bg-success', idle: 'bg-warn', error: 'bg-danger' };
const STATUS_LABEL: Record<string, string> = { running: '运行中', idle: '空闲', error: '异常' };

export default function AgentListView() {
  const indColor = useIndustryColor();
  const { agents, setAgents, loading } = useAgentDetails();

  function toggleAgent(id: string) {
    setAgents((prev) => prev.map((a) => a.id === id ? { ...a, enabled: !a.enabled } : a));
  }

  const runningCount = agents.filter((a) => a.enabled && a.status === 'running').length;

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-2" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="text-sm font-bold">Agent 列表</span>
        <span className="text-[10px] text-text-3">{runningCount} 运行中 · {agents.length} 总计</span>
        <button className="ml-auto rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20 transition-colors">+ 注册Agent</button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mx-4 mt-3">
        {[
          { label: '总任务完成', value: agents.reduce((s, a) => s + a.tasks_completed, 0).toString(), icon: BarChart3 },
          { label: '平均可用率', value: agents.length ? (agents.reduce((s, a) => s + parseFloat(a.uptime), 0) / agents.length).toFixed(1) + '%' : '0%', icon: Zap },
          { label: '启用/总数', value: `${agents.filter((a) => a.enabled).length}/${agents.length}`, icon: Cpu },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-surface p-3 text-center">
            <stat.icon size={14} className="mx-auto text-primary-2 mb-1" />
            <div className="text-base font-extrabold text-text">{stat.value}</div>
            <div className="text-[9px] text-text-3">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {agents.map((agent) => (
          <div key={agent.id} className={cn('rounded-xl border border-border bg-surface p-4 transition-all hover:shadow-lg',
            !agent.enabled && 'opacity-50'
          )}>
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Bot size={20} className="text-primary-2" />
                </div>
                <div className={cn('absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface', STATUS_DOT[agent.status])} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-text">{agent.name}</span>
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[8px] font-bold',
                    agent.status === 'running' ? 'bg-success/10 text-success' : agent.status === 'idle' ? 'bg-warn/10 text-warn' : 'bg-danger/10 text-danger'
                  )}>{STATUS_LABEL[agent.status]}</span>
                  <span className="text-[9px] text-text-3">{agent.model}</span>
                </div>
                <div className="text-[11px] text-text-3 mt-0.5">{agent.desc}</div>
              </div>
              <button onClick={() => toggleAgent(agent.id)} className="shrink-0">
                {agent.enabled ? <ToggleRight size={28} className="text-primary-2" /> : <ToggleLeft size={28} className="text-text-3" />}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3 ml-13">
              {agent.capabilities.map((cap) => (
                <span key={cap} className="rounded-full bg-surface-2 px-2 py-0.5 text-[9px] text-text-3">{cap}</span>
              ))}
              <div className="ml-auto flex items-center gap-3 text-[10px] text-text-3">
                <span>{agent.tasks_completed} 任务</span>
                <span>{agent.uptime} 可用</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
