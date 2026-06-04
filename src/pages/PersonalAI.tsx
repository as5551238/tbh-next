import { useAppStore } from '@/stores/appStore';
import MorningView from '@/pages/ai/MorningView';
import RiskView from '@/pages/ai/RiskView';
import AgentListView from '@/pages/ai/AgentListView';
import AgentConfigView from '@/pages/ai/AgentConfigView';
import IndustryView from '@/pages/ai/IndustryView';
import WorkflowsView from '@/pages/ai/WorkflowsView';
import KpiDashView from '@/pages/ai/KpiDashView';
import ModulePageStub from '@/pages/ModulePageStub';

const AI_MODULES: Record<string, { component: React.FC; title: string; icon: string; desc: string }> = {
  main: { component: MainChatView, title: '工作助手', icon: '🧠', desc: '' },
  morning: { component: MorningView, title: '晨间聚焦', icon: '☀️', desc: 'AI晨间播报' },
  risk: { component: RiskView, title: '风险预警', icon: '⚠️', desc: '风险监控与预警' },
  agentList: { component: AgentListView, title: 'Agent列表', icon: '🤖', desc: 'AI Agent管理' },
  agentConfig: { component: AgentConfigView, title: 'Agent配置', icon: '🔧', desc: 'Agent参数设置' },
  industryView: { component: IndustryView, title: '行业视图', icon: '🏭', desc: '行业视角分析' },
  workflows: { component: WorkflowsView, title: '工作流模板', icon: '📐', desc: '工作流管理' },
  kpiDash: { component: KpiDashView, title: 'KPI仪表盘', icon: '📈', desc: 'KPI数据看板' },
};

import { useState } from 'react';
import { useMatrixCell, useIndustryColor } from '@/hooks/useMatrix';
import { cn } from '@/lib/utils';
import { Send, Bot, User, TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';

const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus };

function MainChatView() {
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);
  const indColor = useIndustryColor();
  const cell = useMatrixCell();
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, role: 'ai' as const, text: `☀️ 晨间播报\n\n${cell.morning}\n\n📊 实时数据: ${cell.ribbon}\n\n有什么需要我帮你分析的？`, time: '08:00' },
  ]);

  function generateAIReply(input: string): string {
    if (input.includes('KPI') || input.includes('指标')) return cell.kpis.map((k) => `${k.status === 'good' ? '✅' : k.status === 'warn' ? '⚠️' : '🔴'} ${k.name}: ${k.value}（目标 ${k.target}）`).join('\n');
    if (input.includes('风险') || input.includes('预警')) return cell.top3.map((t) => `${t.level === 'danger' ? '🔴' : t.level === 'warn' ? '⚠️' : 'ℹ️'} ${t.text}`).join('\n');
    if (input.includes('流程') || input.includes('工作流')) return cell.workflow.map((w, i) => `${i === cell.wfCurrent ? '👉' : '  '} ${i + 1}. ${w}`).join('\n');
    return `收到！基于「${industry} · ${dept}」的上下文，我来帮你分析。你可以问我：\n- "当前KPI怎么样？"\n- "有什么风险预警？"\n- "工作流进度如何？"`;
  }

  function handleSend() {
    if (!chatInput.trim()) return;
    const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, { id: Date.now(), role: 'user' as const, text: chatInput.trim(), time: now }, { id: Date.now() + 1, role: 'ai' as const, text: generateAIReply(chatInput.trim()), time: now }]);
    setChatInput('');
  }

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col border-r border-border min-w-0">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10"><Bot size={14} className="text-primary-2" /></div>
          <span className="text-sm font-bold">工作助手</span>
          <span className="rounded-full bg-success/10 px-2 py-0.5 text-[9px] font-bold text-success">在线</span>
          <span className="ml-2 rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ backgroundColor: indColor + '20', color: indColor }}>{industry} · {dept}</span>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className={cn('flex gap-2.5', msg.role === 'user' && 'flex-row-reverse')}>
              <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold', msg.role === 'ai' ? 'bg-primary/10 text-primary-2' : 'bg-accent/10 text-accent')}>
                {msg.role === 'ai' ? <Bot size={14} /> : <User size={14} />}
              </div>
              <div className={cn('max-w-[75%] rounded-xl px-3 py-2.5 text-xs leading-relaxed whitespace-pre-line', msg.role === 'ai' ? 'bg-primary/10 text-primary-2' : 'bg-accent/10 text-text')}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-1.5 px-4 py-2 border-t border-border">
          {['KPI怎么样？', '风险预警', '工作流进度'].map((q) => (
            <button key={q} onClick={() => setChatInput(q)} className="rounded-full border border-border px-2.5 py-1 text-[10px] text-text-3 transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary-2">{q}</button>
          ))}
        </div>
        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
            <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="问我任何关于你工作的事..." className="flex-1 bg-transparent text-xs text-text outline-none placeholder:text-text-3" />
            <button onClick={handleSend} className="rounded-lg bg-primary p-1.5 text-white transition-opacity hover:opacity-80"><Send size={14} /></button>
          </div>
        </div>
      </div>
      <div className="flex w-[380px] shrink-0 flex-col overflow-y-auto">
        <div className="border-b border-border p-4">
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
        <div className="border-b border-border p-4">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-3">工作流</div>
          <div className="flex flex-wrap gap-1.5">
            {cell.workflow.map((step, i) => (
              <div key={step} className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]', i === cell.wfCurrent && 'bg-accent/15 font-semibold text-accent', i < cell.wfCurrent && 'bg-success/10 text-success', i > cell.wfCurrent && 'bg-surface-2 text-text-3')}>
                <span>{step}</span>{i < cell.workflow.length - 1 && <ChevronRight size={10} className="text-text-3" />}
              </div>
            ))}
          </div>
        </div>
        <div className="border-b border-border p-4">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-3">AI 同事</div>
          <div className="space-y-2">
            {cell.agents.map((agent) => (
              <div key={agent.name} className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 shrink-0"><Bot size={14} className="text-primary-2" /></div>
                <div className="min-w-0"><div className="text-xs font-semibold text-text">{agent.name}</div><div className="text-[9px] text-text-3">{agent.desc}</div></div>
                <span className={cn('ml-auto rounded-full px-1.5 py-0.5 text-[8px] font-bold shrink-0', agent.status === '在线' && 'bg-success/10 text-success', agent.status === '告警中' && 'bg-warn/10 text-warn', agent.status !== '在线' && agent.status !== '告警中' && 'bg-surface-2 text-text-3')}>{agent.status}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4">
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
    </div>
  );
}

export default function PersonalAI() {
  const activeModule = useAppStore((s) => s.activeModule);
  const mod = AI_MODULES[activeModule];
  if (mod) { const Content = mod.component; return <Content />; }
  return <ModulePageStub title={activeModule} icon='🚧' description='此模块正在开发中' />;
}
