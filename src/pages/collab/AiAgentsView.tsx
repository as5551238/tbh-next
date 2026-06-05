import { useState } from 'react';
import { useMatrixCell, useIndustryColor } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { Bot, ToggleLeft, ToggleRight, Settings, Play, Pause, MessageSquare, BarChart3, RefreshCw } from 'lucide-react';

export default function AiAgentsView() {
  const { cell, loading } = useMatrixCell();
  const indColor = useIndustryColor();
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);

  const [agents, setAgents] = useState(cell.agents.map((a) => ({ ...a, enabled: true })));

  function toggleAgent(name: string) {
    setAgents((prev) => prev.map((a) => a.name === name ? { ...a, enabled: !a.enabled } : a));
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="text-sm font-bold">AI 同事管理</span>
        <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ backgroundColor: indColor + '20', color: indColor }}>{industry} · {dept}</span>
        <span className="text-[10px] text-text-3">{agents.filter((a) => a.enabled).length}/{agents.length} 启用</span>
        <button className="ml-auto rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20 transition-colors">+ 添加AI同事</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Description */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-xs text-text-2 leading-relaxed">
            AI同事是与你同在一个团队的智能助手，它们会持续监控数据、提供分析、参与协作。你可以根据需要启用或禁用特定的AI同事。
          </p>
        </div>

        {agents.map((agent) => (
          <div key={agent.name} className={cn('rounded-xl border border-border bg-surface p-4 transition-all hover:shadow-lg',
            !agent.enabled && 'opacity-50'
          )}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                <Bot size={20} className="text-primary-2" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-text">{agent.name}</span>
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[8px] font-bold',
                    agent.enabled ? 'bg-success/10 text-success' : 'bg-surface-2 text-text-3'
                  )}>
                    {agent.enabled ? '已启用' : '已禁用'}
                  </span>
                </div>
                <div className="text-[11px] text-text-3">{agent.desc}</div>
              </div>
              <button onClick={() => toggleAgent(agent.name)} className="shrink-0">
                {agent.enabled ? (
                  <ToggleRight size={28} className="text-primary-2" />
                ) : (
                  <ToggleLeft size={28} className="text-text-3" />
                )}
              </button>
            </div>
            {agent.enabled && (
              <div className="flex items-center gap-2 mt-3 ml-13">
                <button className="flex items-center gap-1 rounded-lg bg-surface-2 px-2.5 py-1 text-[9px] text-text-3 hover:text-text transition-colors">
                  <MessageSquare size={10} />对话
                </button>
                <button className="flex items-center gap-1 rounded-lg bg-surface-2 px-2.5 py-1 text-[9px] text-text-3 hover:text-text transition-colors">
                  <BarChart3 size={10} />统计
                </button>
                <button className="flex items-center gap-1 rounded-lg bg-surface-2 px-2.5 py-1 text-[9px] text-text-3 hover:text-text transition-colors">
                  <Settings size={10} />配置
                </button>
                <button className="flex items-center gap-1 rounded-lg bg-surface-2 px-2.5 py-1 text-[9px] text-text-3 hover:text-text transition-colors">
                  <RefreshCw size={10} />重启
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
