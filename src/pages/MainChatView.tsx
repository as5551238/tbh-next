import { useGateCheck } from '@/hooks/useGateCheck';
import PaywallModal from '@/components/PaywallModal';
import { hasFeature } from '@/lib/subscription';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMatrixCell, useIndustryColor, useGoals, useTasks, useActionItems, useDeviationAlerts } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { useAuth } from '@/lib/auth';
import { useRealtime } from '@/hooks/useRealtime';
import { cn } from '@/lib/utils';
import { Send, Bot, User, TrendingUp, TrendingDown, Minus, ChevronRight, Zap, Target, ListTodo, PlusCircle, ShieldAlert, ArrowRight, AlertTriangle, CheckCircle2, Brain } from 'lucide-react';
import { chatCompletion, buildSystemPrompt, type ChatMessage } from '@/lib/aiService';
import { routeToAgent, ALL_AGENTS, type AgentDef } from '@/lib/agents';
import { auditStore } from '@/lib/agentHarness';
import { createMessage, fetchMessages, type MessageRow } from '@/lib/dataLayer';
import { executeToolCall } from '@/lib/aiTools';
import { fetchSubscription, fetchUsageToday, isActionAllowed, PLAN_LIMITS, type UsageSummary } from '@/lib/subscription';

const AI_ASSISTANT_CHANNEL = 'ai-assistant';

const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus };

// --- AI即界面: Format tool results as readable text ---
function formatToolResult(toolName: string, result: unknown[]): string {
  if (!Array.isArray(result) || result.length === 0) {
    return toolName.startsWith('get_') ? '暂无数据。' : '操作完成。';
  }
  const items = result as Record<string, unknown>[];
  switch (toolName) {
    case 'get_goals':
      return items.map((g, i) => `${i + 1}. 🎯 ${g.title} — 进度 ${g.progress}%, 状态 ${g.status}${g.end_date ? `, 截止 ${g.end_date}` : ''}`).join('\n');
    case 'get_tasks':
      return items.map((t, i) => `${i + 1}. ✅ ${t.title} — ${t.status}${t.priority ? `, 优先级 ${t.priority}` : ''}${t.due_date ? `, 截止 ${t.due_date}` : ''}`).join('\n');
    case 'get_action_items':
      return items.map((a, i) => `${i + 1}. 🔧 ${a.title} — ${a.status}, 优先级 ${a.priority}`).join('\n');
    default:
      return JSON.stringify(result, null, 2).slice(0, 500);
  }
}

interface ChatMsg {
  id: number;
  role: 'user' | 'ai' | 'tool';
  text: string;
  time: string;
  agent?: string;
  agentIcon?: string;
  streaming?: boolean;
  toolName?: string;
  toolResult?: Record<string, unknown>[];
  actions?: Array<{ label: string; module: string; iface: string }>;
}

function MainChatView() {
  const { showPaywall: mcShow, paywallReason: mcReason, paywallFeature: mcFeat, closePaywall: mcClose, requireFeature: mcRequire } = useGateCheck();
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);
  const indColor = useIndustryColor();
  const storeNavigateTo = useAppStore((s) => s.navigateTo);
  const navigate = useNavigate();
  const { cell, loading } = useMatrixCell();
  const { user } = useAuth();
  const { goals } = useGoals();
  const { tasks } = useTasks();
  const { items: actionItems } = useActionItems();
  const { alerts: deviationAlerts } = useDeviationAlerts(true);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [limitWarning, setLimitWarning] = useState<string | null>(null);
  const [activeAgent, setActiveAgent] = useState<AgentDef | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Smart context for "功能找人" ---
  const overdueTasks = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return tasks.filter((t) => !t.done && t.due_date && t.due_date < today && t.status !== 'cancelled');
  }, [tasks]);

  const atRiskGoals = useMemo(() => goals.filter((g) => g.status === 'at_risk' || (g.progress < 50 && g.end_date && new Date(g.end_date) < new Date(Date.now() + 14 * 86400000))), [goals]);

  const openActionItems = useMemo(() => actionItems.filter((a) => a.status === 'open' || a.status === 'in_progress'), [actionItems]);

  function navTo(iface: string, mod: string) {
    const path = storeNavigateTo(iface, mod);
    navigate(path);
  }

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, []);

  // --- AI即界面: Tool-triggered quick actions ---
  const handleToolAction = useCallback(async (toolName: string, args: Record<string, unknown>, label: string, navModule?: string, navIface?: string) => {
    if (isTyping) return;
    const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const toolMsg: ChatMsg = {
      id: Date.now(),
      role: 'tool',
      text: label,
      time: now,
      toolName,
    };
    setMessages((prev) => [...prev, toolMsg]);
    scrollToBottom();

    try {
      const result = await executeToolCall(toolName, args) as Record<string, unknown>[];
      const resultMsg: ChatMsg = {
        id: Date.now() + 1,
        role: 'ai',
        text: formatToolResult(toolName, result),
        time: now,
        agentIcon: '⚡',
        toolResult: result,
        actions: navModule ? [{ label: `查看详情 →`, module: navModule, iface: navIface ?? 'workspace' }] : undefined,
      };
      setMessages((prev) => [...prev, resultMsg]);
    } catch {
      setMessages((prev) => [...prev, {
        id: Date.now() + 1, role: 'ai', text: '操作失败，请稍后重试。', time: now, agentIcon: '⚠️',
      }]);
    }
    scrollToBottom();
  }, [isTyping, scrollToBottom]);

  const handleNavAction = useCallback((iface: string, module: string) => {
    navTo(iface, module);
  }, []);

  // Load historical messages on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await fetchMessages(AI_ASSISTANT_CHANNEL);
      if (cancelled) return;
      const loaded: ChatMsg[] = rows.map((m, i) => ({
        id: i + 1,
        role: m.sender_type === 'ai' ? 'ai' as const : m.sender_type === 'system' ? 'ai' as const : m.sender_type === 'tool' ? 'tool' as const : 'user' as const,
        text: m.content,
        time: m.created_at ? new Date(m.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '',
        agent: m.sender_type === 'ai' ? 'general' : undefined,
        agentIcon: m.sender_type === 'ai' ? '🧠' : m.sender_type === 'tool' ? '⚡' : undefined,
      }));
      if (loaded.length === 0 && cell.morning) {
        loaded.push({
          id: 1,
          role: 'ai',
          text: `☀️ 晨间播报\n\n${cell.morning}\n\n📊 业务概览: ${cell.ribbon}\n\n有什么需要我帮你分析的？`,
          time: '08:00',
          agent: 'morning-brief',
          agentIcon: '☀️',
        });
      }
      setMessages(loaded);
      setHistoryLoaded(true);
      scrollToBottom();
    })();
    return () => { cancelled = true; };
  }, [cell.morning, cell.ribbon, scrollToBottom]);

  // Subscribe to realtime messages for this channel
  useRealtime(
    'messages',
    useCallback((payload) => {
      if (payload.new?.channel !== AI_ASSISTANT_CHANNEL) return;
      if (payload.eventType !== 'INSERT') return;
      const m = payload.new;
      setMessages((prev) => {
        if (prev.some((ex) => ex.text === (m.content as string) && ex.role === (m.sender_type === 'ai' ? 'ai' : 'user'))) return prev;
        return [
          ...prev,
          {
            id: Date.now(),
            role: m.sender_type === 'ai' ? 'ai' as const : 'user' as const,
            text: m.content as string ?? '',
            time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          },
        ];
      });
      scrollToBottom();
    }, [scrollToBottom]),
    { column: 'channel', value: AI_ASSISTANT_CHANNEL },
  );

  async function checkAiLimit(): Promise<boolean> {
    if (!user?.id) return true; // No user = no limit check
    try {
      const [subInfo, usageToday] = await Promise.all([
        fetchSubscription(user.id),
        fetchUsageToday(user.id),
      ]);
      const plan = localStorage.getItem('tbh-sub-plan') ?? subInfo.plan;
      const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
      const usage: UsageSummary = {
        aiQueries: usageToday.aiQueries,
        aiQueriesLimit: limits.aiQueriesPerDay,
        agents: 0, agentsLimit: 0,
        teamMembers: 0, teamMembersLimit: 0,
        projects: 0, projectsLimit: 0,
        docs: 0, docsLimit: 0,
        goals: 0,
        goalsLimit: 0,
        tasks: 0,
        tasksLimit: 0,
      };
      const check = isActionAllowed(plan, 'ai_query', usage);
      if (!check.allowed) {
        setLimitWarning(check.reason ?? '额度已用完');
        mcRequire('advancedAnalytics', check.reason ?? 'AI查询已超出免费额度，升级可无限使用');
        return false;
      }
      setLimitWarning(null);
      return true;
    } catch {
      return true; // On error, allow
    }
  }

  async function handleSend() {
    if (!chatInput.trim() || isTyping) return;
    // Check AI usage limits before sending
    const allowed = await checkAiLimit();
    if (!allowed) return;
    const input = chatInput.trim();
    const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

    const matchedAgent = routeToAgent(input);
    setActiveAgent(matchedAgent);

    const userMsg: ChatMsg = { id: Date.now(), role: 'user', text: input, time: now };
    setMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    // Persist user message
    createMessage({
      channel: AI_ASSISTANT_CHANNEL,
      content: input,
      sender_type: 'user',
      sender_name: user?.name ?? '我',
    });

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

    const abort = new AbortController();
    abortRef.current = abort;

    let fullText = '';

    chatCompletion(aiMessages, {
      stream: true,
      signal: abort.signal,
      harness: { agentId: matchedAgent?.id ?? '_general' },
      enableTools: true,
      onChunk: (chunk, done) => {
        if (done) {
          fullText = fullText || chunk;
          setMessages((prev) =>
            prev.map((m) => (m.id === aiMsgId ? { ...m, streaming: false } : m))
          );
          setIsTyping(false);
          scrollToBottom();
          // Persist AI response after streaming completes
          createMessage({
            channel: AI_ASSISTANT_CHANNEL,
            content: fullText,
            sender_type: 'ai',
            sender_name: matchedAgent?.name ?? 'AI助手',
          });
          return;
        }
        fullText += chunk;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId ? { ...m, text: m.text + chunk } : m
          )
        );
        scrollToBottom();
      },
    }).catch((err) => {
      if (err?.name === 'AbortError') return;
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
               <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold', msg.role === 'ai' ? 'bg-primary/10 text-primary-2' : msg.role === 'tool' ? 'bg-accent/10 text-accent' : 'bg-accent/10 text-accent')}>
                 {msg.role === 'ai' ? <Bot size={14} /> : msg.role === 'tool' ? <Zap size={14} /> : <User size={14} />}
               </div>
               <div className={cn('max-w-[75%] rounded-xl px-3 py-2.5 text-xs leading-relaxed whitespace-pre-line', msg.role === 'ai' ? 'bg-primary/10 text-primary-2' : msg.role === 'tool' ? 'bg-accent/10 text-accent' : 'bg-accent/10 text-text')}>
                 {msg.text}
                 {msg.streaming && <span className="inline-block w-1.5 h-4 ml-1 bg-primary-2 animate-pulse align-text-bottom" />}
               </div>
               {/* AI即界面: Action buttons after AI/tool messages */}
               {msg.actions && msg.actions.length > 0 && (
                 <div className="flex flex-col justify-end gap-1">
                   {msg.actions.map((act) => (
                     <button key={act.label} onClick={() => navTo(act.iface, act.module)} className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[10px] text-primary-2 transition-all hover:bg-primary/20">
                       {act.label}<ArrowRight size={10} />
                     </button>
                   ))}
                 </div>
               )}
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

         {/* AI即界面: Smart context bar */}
         {(overdueTasks.length > 0 || atRiskGoals.length > 0 || openActionItems.length > 0 || deviationAlerts.length > 0) && (
           <div className="flex flex-wrap gap-1.5 px-4 py-1.5 border-t border-border bg-danger/5">
             {overdueTasks.length > 0 && (
               <button onClick={() => navTo('workspace', 'tasks')} className="flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-[10px] text-danger hover:bg-danger/20 transition-colors" disabled={isTyping}>
                 <AlertTriangle size={10} />{overdueTasks.length}个逾期任务
               </button>
             )}
             {atRiskGoals.length > 0 && (
               <button onClick={() => navTo('workspace', 'goals')} className="flex items-center gap-1 rounded-full bg-warn/10 px-2 py-0.5 text-[10px] text-warn hover:bg-warn/20 transition-colors" disabled={isTyping}>
                 <ShieldAlert size={10} />{atRiskGoals.length}个风险目标
               </button>
             )}
             {deviationAlerts.length > 0 && (
               <button onClick={() => navTo('ai', 'risk')} className="flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-[10px] text-danger hover:bg-danger/20 transition-colors" disabled={isTyping}>
                 <AlertTriangle size={10} />{deviationAlerts.length}个偏差告警
               </button>
             )}
             {openActionItems.length > 0 && (
               <button onClick={() => navTo('workspace', 'actionItems')} className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary-2 hover:bg-primary/20 transition-colors" disabled={isTyping}>
                 <CheckCircle2 size={10} />{openActionItems.length}个待办行动项
               </button>
             )}
           </div>
         )}

         {/* AI即界面: Functional quick-action cards */}
         <div className="grid grid-cols-4 gap-1.5 px-4 py-2 border-t border-border">
           <button onClick={() => handleToolAction('get_goals', {}, '正在获取目标...', 'goals', 'workspace')} className="flex flex-col items-center gap-1 rounded-lg border border-border p-2 transition-all hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50" disabled={isTyping}>
             <Target size={14} className="text-primary-2" /><span className="text-[9px] text-text-3">查看目标</span>
           </button>
           <button onClick={() => handleToolAction('get_tasks', {}, '正在获取任务...', 'tasks', 'workspace')} className="flex flex-col items-center gap-1 rounded-lg border border-border p-2 transition-all hover:border-success/50 hover:bg-success/5 disabled:opacity-50" disabled={isTyping}>
             <ListTodo size={14} className="text-success" /><span className="text-[9px] text-text-3">我的任务</span>
           </button>
           <button onClick={() => handleToolAction('get_action_items', { status: 'open' }, '正在获取行动项...', 'actionItems', 'workspace')} className="flex flex-col items-center gap-1 rounded-lg border border-border p-2 transition-all hover:border-warn/50 hover:bg-warn/5 disabled:opacity-50" disabled={isTyping}>
             <CheckCircle2 size={14} className="text-warn" /><span className="text-[9px] text-text-3">行动项</span>
           </button>
           <button onClick={() => handleNavAction('ai', 'risk')} className="flex flex-col items-center gap-1 rounded-lg border border-border p-2 transition-all hover:border-danger/50 hover:bg-danger/5 disabled:opacity-50" disabled={isTyping}>
             <ShieldAlert size={14} className="text-danger" /><span className="text-[9px] text-text-3">风险检查</span>
           </button>
           <button onClick={() => !isTyping && setChatInput('帮我创建一个新任务：')} className="flex flex-col items-center gap-1 rounded-lg border border-border p-2 transition-all hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50" disabled={isTyping}>
             <PlusCircle size={14} className="text-primary-2" /><span className="text-[9px] text-text-3">创建任务</span>
           </button>
           <button onClick={() => navTo('workspace', 'overview')} className="flex flex-col items-center gap-1 rounded-lg border border-border p-2 transition-all hover:border-accent/50 hover:bg-accent/5 disabled:opacity-50" disabled={isTyping}>
             <Brain size={14} className="text-accent" /><span className="text-[9px] text-text-3">今日聚焦</span>
           </button>
           <button onClick={() => navTo('ai', 'kpiDash')} className="flex flex-col items-center gap-1 rounded-lg border border-border p-2 transition-all hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50" disabled={isTyping}>
             <TrendingUp size={14} className="text-primary-2" /><span className="text-[9px] text-text-3">KPI看板</span>
           </button>
           <button onClick={() => navTo('workspace', 'review')} className="flex flex-col items-center gap-1 rounded-lg border border-border p-2 transition-all hover:border-success/50 hover:bg-success/5 disabled:opacity-50" disabled={isTyping}>
             <Zap size={14} className="text-success" /><span className="text-[9px] text-text-3">发起复盘</span>
           </button>
         </div>

         {/* Input */}
         <div className="border-t border-border px-4 py-3">
           {limitWarning && (
             <div className="mb-2 flex items-center justify-between rounded-lg bg-danger/10 px-3 py-2 text-[10px] text-danger">
               <span>{limitWarning}</span>
               <button onClick={() => navTo('ai', 'subscription')} className="rounded-md bg-danger/20 px-2 py-0.5 text-[9px] font-semibold text-danger hover:bg-danger/30">升级方案</button>
             </div>
           )}
          <div className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
            <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()} placeholder="问我任何关于你工作的事..." aria-label="AI聊天输入框" className="flex-1 bg-transparent text-xs text-text outline-none placeholder:text-text-3" disabled={isTyping} />
            <button onClick={handleSend} className="rounded-lg bg-primary p-1.5 text-white transition-opacity hover:opacity-80 disabled:opacity-50" disabled={isTyping || !chatInput.trim()}>
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
              <button key={agent.id} onClick={() => { setActiveAgent(agent); setChatInput(''); }} className={cn( 'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-all', activeAgent?.id === agent.id ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-surface-2 hover:bg-surface-3' )}>
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

      <PaywallModal open={mcShow} onClose={mcClose} reason={mcReason} feature={mcFeat} />
    </div>
  );
}

export default MainChatView;
