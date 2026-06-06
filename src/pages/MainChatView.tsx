import { useState, useRef, useCallback } from 'react';
import { useMatrixCell, useIndustryColor } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { Send, Bot, User, TrendingUp, TrendingDown, Minus, ChevronRight, Zap } from 'lucide-react';
import { chatCompletion, buildSystemPrompt, type ChatMessage } from '@/lib/aiService';
import { routeToAgent, ALL_AGENTS, type AgentDef } from '@/lib/agents';
import { auditStore } from '@/lib/agentHarness';

const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus };

interface ChatMsg {
  id: number;
  role: 'user' | 'ai';
  text: string;
  time: string;
  agent?: string;
  agentIcon?: string;
  streaming?: boolean;
}

function MainChatView() {
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);
  const indColor = useIndustryColor();
  const { cell, loading } = useMatrixCell();
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: 1, role: 'ai', text: `☀️ 晨间播报\n\n${cell.morning}\n\n📊 业务概览: ${cell.ribbon}\n\n有什么需要我帮你分析的？`, time: '08:00', agent: 'morning-brief', agentIcon: '☀️' },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeAgent, setActiveAgent] = useState<AgentDef | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, []);

  function handleSend() {
    if (!chatInput.trim() || isTyping) return;
    const input = chatInput.trim();
    const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

    // Route to agent
    const matchedAgent = routeToAgent(input);
    setActiveAgent(matchedAgent);

    // Add user message
    const userMsg: ChatMsg = { id: Date.now(), role: 'user', text: input, time: now };
    setMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    // Build messages for AI
    const systemPrompt = matchedAgent
      ? matchedAgent.systemPrompt(cell, industry, dept)
      : buildSystemPrompt(cell, industry, dept);

    const aiMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages
        .filter((m) => m.role === 'user' || m.role === 'ai')
        .map((m) => ({
          role: m.role === 'user' ? 'user' as const : 'assistant' as const,
          content: m.text,
        })),
      { role: 'user', content: input },
    ];

    // Create placeholder for streaming AI response
    const aiMsgId = Date.now() + 1;
    const aiMsg: ChatMsg = {
      id: aiMsgId,
      role: 'ai',
      text: '',
      time: now,
      agent: matchedAgent?.id ?? 'general',
      agentIcon: matchedAgent?.icon ?? '🧠',
      streaming: true,
    };
    setMessages((prev) => [...prev, aiMsg]);
    scrollToBottom();

    // Call AI service
    const abort = new AbortController();
    abortRef.current = abort;

    chatCompletion(aiMessages, {
      stream: true,
      signal: abort.signal,
      harness: { agentId: matchedAgent?.id ?? '_general' },
      enableTools: true,
      onChunk: (chunk, done) => {
        if (done) {
          setMessages((prev) =>
            prev.map((m) => (m.id === aiMsgId ? { ...m, streaming: false } : m))
          );
          setIsTyping(false);
          scrollToBottom();
          return;
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId ? { ...m, text: m.text + chunk } : m
          )
        );
        scrollToBottom();
      },
    }).catch((err) => {
      if (err?.name === 'AbortError') return;
      // AI call failed — show error message
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? { ...m, text: '抱歉，AI服务暂时不可用，请稍后重试。', streaming: false }
            : m
        )
      );
      setIsTyping(false);
    });
  }

  return (
    <div className="flex h-full">
      {/* Left: Chat area */}
      <div className="flex flex-1 flex-col border-r border-border min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
            <Bot size={14} className="text-primary-2" />
          </div>
          <span className="text-sm font-bold">工作助手</span>
          {activeAgent ? (
            <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ backgroundColor: activeAgent.color + '20', color: activeAgent.color }}>
              {activeAgent.icon} {activeAgent.name}
            </span>
          ) : (
            <span className="rounded-full bg-success/10 px-2 py-0.5 text-[9px] font-bold text-success">在线</span>
          )}
          <span className="ml-2 rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ backgroundColor: indColor + '20', color: indColor }}>{industry} · {dept}</span>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className={cn('flex gap-2.5', msg.role === 'user' && 'flex-row-reverse')}>
              <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold', msg.role === 'ai' ? 'bg-primary/10 text-primary-2' : 'bg-accent/10 text-accent')}>
                {msg.role === 'ai' ? <Bot size={14} /> : <User size={14} />}
              </div>
              <div className={cn('max-w-[75%] rounded-xl px-3 py-2.5 text-xs leading-relaxed whitespace-pre-line', msg.role === 'ai' ? 'bg-primary/10 text-primary-2' : 'bg-accent/10 text-text')}>
                {msg.text}
                {msg.streaming && <span className="inline-block w-1.5 h-4 ml-1 bg-primary-2 animate-pulse align-text-bottom" />}
              </div>
            </div>
          ))}
          {isTyping && messages[messages.length - 1]?.streaming !== true && (
            <div className="flex gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary-2"><Bot size={14} /></div>
              <div className="rounded-xl bg-primary/10 px-3 py-2.5 text-xs text-primary-2">
                <span className="inline-flex gap-1"><span className="animate-bounce">·</span><span className="animate-bounce" style={{ animationDelay: '0.15s' }}>·</span><span className="animate-bounce" style={{ animationDelay: '0.3s' }}>·</span></span>
              </div>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex gap-1.5 px-4 py-2 border-t border-border">
          {['今日聚焦', 'KPI怎么样？', '风险预警', '工作流进度'].map((q) => (
            <button key={q} onClick={() => !isTyping && setChatInput(q)} className="rounded-full border border-border px-2.5 py-1 text-[10px] text-text-3 transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary-2 disabled:opacity-50" disabled={isTyping}>{q}</button>
          ))}
        </div>

        {/* Input */}
        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="问我任何关于你工作的事..."
              aria-label="AI聊天输入框"
              className="flex-1 bg-transparent text-xs text-text outline-none placeholder:text-text-3"
              disabled={isTyping}
            />
            <button
              onClick={handleSend}
              className="rounded-lg bg-primary p-1.5 text-white transition-opacity hover:opacity-80 disabled:opacity-50"
              disabled={isTyping || !chatInput.trim()}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Right: Context panel */}
      <div className="flex w-[380px] shrink-0 flex-col overflow-y-auto">
        {/* Agent switcher */}
        <div className="border-b border-border p-4">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-3">AI 同事</div>
          <div className="space-y-2">
            {ALL_AGENTS.map((agent) => (
              <button
                key={agent.id}
                onClick={() => { setActiveAgent(agent); setChatInput(''); }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-all',
                  activeAgent?.id === agent.id ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-surface-2 hover:bg-surface-3'
                )}
              >
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

        {/* Workflow */}
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

        {/* Top 3 alerts */}
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

export default MainChatView;
