import { useState, useCallback, useRef, useMemo } from 'react';
import { useAppStore } from '@/stores/appStore';
import { useMatrixCell, useIndustryColor, useGoals, useTasks, useActionItems } from '@/hooks/useMatrix';
import type { ActionItemRow } from '@/lib/dataLayer';
import { chatCompletion, buildSystemPrompt, type ChatMessage } from '@/lib/aiService';
import { routeToAgent, ALL_AGENTS, type AgentDef } from '@/lib/agents';
import { buildModuleContext } from '@/lib/moduleContext';
import { auditStore } from '@/lib/agentHarness';
import { executeToolCall } from '@/lib/aiTools';
import { parseAndExecute, resolveNaturalDate, type IntentType, type ConversationTurn } from '@/lib/intentParser';
import { agentPlan, agentExecute, undoOperation, type AgentLoopResult } from '@/lib/agentLoop';
import { fetchSubscription, fetchUsageToday, isActionAllowed, PLAN_LIMITS, type UsageSummary } from '@/lib/subscription';
import { useAuth } from '@/lib/auth';
import { createMessage } from '@/lib/dataLayer';
import { trackEvent } from '@/lib/behaviorTracker';
import { recordApiCall, recordError } from '@/lib/monitoring';
import type { ChatMsg } from './useChatMessages';

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
    case 'get_deviation_alerts':
      return items.map((a, i) => `${i + 1}. ⚠️ ${a.title ?? a.description ?? '偏差项'} — 级别 ${a.severity ?? 'medium'}`).join('\n');
    case 'get_schedule_events':
      return items.map((e, i) => `${i + 1}. 📅 ${e.title} — ${e.start_date ?? e.event_date ?? '日期未定'}`).join('\n');
    case 'create_action_item':
      return items.length > 0 ? `行动项已创建: ${items[0].title}` : '行动项创建完成。';
    default:
      return JSON.stringify(result, null, 2).slice(0, 500);
  }
}

export function useAgentLoop(
  messages: ChatMsg[],
  setMessages: React.Dispatch<React.SetStateAction<ChatMsg[]>>,
  cell: ReturnType<typeof useMatrixCell>['cell'],
  scrollToBottom: () => void,
  AI_ASSISTANT_CHANNEL: string,
) {
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);
  const industryRaw = useAppStore((s) => s.industryRaw);
  const deptRaw = useAppStore((s) => s.deptRaw);
  const activeModule = useAppStore((s) => s.activeModule);
  const { user } = useAuth();
  const { goals } = useGoals();
  const { tasks } = useTasks();
  const { actionItems } = useActionItems();

  const [isTyping, setIsTyping] = useState(false);
  const [activeAgent, setActiveAgent] = useState<AgentDef | null>(null);
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [fallbackIntent, setFallbackIntent] = useState<IntentType>('unknown');
  const [fallbackRawText, setFallbackRawText] = useState('');
  const [limitWarning, setLimitWarning] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<{ result: AgentLoopResult; chatHistory: ConversationTurn[] } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const overdueTasks = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return tasks.filter((t) => !t.done && t.due_date && t.due_date < today && t.status !== 'cancelled');
  }, [tasks]);

  const atRiskGoals = useMemo(() => goals.filter((g) => g.status === 'at_risk' || (g.progress < 50 && g.end_date && new Date(g.end_date) < new Date(Date.now() + 14 * 86400000))), [goals]);

  const openActionItems = useMemo(() => actionItems.filter((a: ActionItemRow) => a.status === 'open' || a.status === 'in_progress'), [actionItems]);

  // Check AI limit
  async function checkAiLimit(): Promise<boolean> {
    if (!user?.id) return true;
    try {
      const [subInfo, usageToday] = await Promise.all([fetchSubscription(user.id), fetchUsageToday(user.id)]);
      const plan = localStorage.getItem('tbh-sub-plan') ?? subInfo.plan;
      const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
      const usage: UsageSummary = {
        aiQueries: usageToday.aiQueries, aiQueriesLimit: limits.aiQueriesPerDay,
        agents: 0, agentsLimit: 0, teamMembers: 0, teamMembersLimit: 0,
        projects: 0, projectsLimit: 0, docs: 0, docsLimit: 0,
        goals: 0, goalsLimit: 0, tasks: 0, tasksLimit: 0,
      };
      const check = isActionAllowed(plan, 'ai_query', usage);
      if (!check.allowed) {
        setLimitWarning(check.reason ?? '额度已用完');
        return false;
      }
      setLimitWarning(null);
      return true;
    } catch {
      return true;
    }
  }

  // Tool-triggered quick action
  const handleToolAction = useCallback(async (toolName: string, args: Record<string, unknown>, label: string, navModule?: string, navIface?: string) => {
    if (isTyping) return;
    const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const toolMsg: ChatMsg = { id: Date.now(), role: 'tool', text: label, time: now, toolName };
    setMessages((prev) => [...prev, toolMsg]);
    scrollToBottom();
    try {
      const result = await executeToolCall(toolName, args) as Record<string, unknown>[];
      const resultMsg: ChatMsg = {
        id: Date.now() + 1, role: 'ai', text: formatToolResult(toolName, result), time: now,
        agentIcon: '⚡', toolResult: result,
        actions: navModule ? [{ label: `查看详情 →`, module: navModule, iface: navIface ?? 'workspace' }] : undefined,
      };
      setMessages((prev) => [...prev, resultMsg]);
    } catch {
      recordError('tool_execute', toolName + ': execution failed');
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'ai', text: '操作失败，请稍后重试。', time: now, agentIcon: '⚠️' }]);
    }
    scrollToBottom();
  }, [isTyping, scrollToBottom, setMessages]);

  // Fallback form submit
  const handleFallbackSubmit = useCallback(async (intent: IntentType, params: Record<string, unknown>) => {
    const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    if (params.due_date && typeof params.due_date === 'string') {
      const resolved = resolveNaturalDate(params.due_date);
      if (resolved) params.due_date = resolved;
    }
    const toolName = intent === 'create_task' ? 'create_task' : intent === 'update_task' ? 'update_task_status' : intent === 'create_action_item' ? 'create_action_item' : '';
    if (!toolName) return;
    const toolMsg: ChatMsg = { id: Date.now(), role: 'tool', text: `正在执行: ${toolName}...`, time: now, toolName };
    setMessages((prev) => [...prev, toolMsg]);
    scrollToBottom();
    try {
      const result = await executeToolCall(toolName, params) as Record<string, unknown>[];
      const navModule = toolName === 'create_task' || toolName === 'update_task_status' ? 'tasks' : undefined;
      const resultMsg: ChatMsg = {
        id: Date.now() + 1, role: 'ai', text: formatToolResult(toolName, result), time: now,
        agentIcon: '✅', toolResult: result,
        actions: navModule ? [{ label: '查看任务 →', module: navModule, iface: 'workspace' }] : undefined,
      };
      setMessages((prev) => [...prev, resultMsg]);
      scrollToBottom();
    } catch {
      recordError('tool_execute_fallback', toolName + ': fallback execution failed');
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'ai', text: '操作失败，请稍后重试。', time: now, agentIcon: '⚠️' }]);
      scrollToBottom();
    }
  }, [scrollToBottom, setMessages]);

  // Confirm/reject execution
  const handleConfirmExecution = useCallback(async () => {
    if (!pendingConfirmation) return;
    const { result } = pendingConfirmation;
    setPendingConfirmation(null);
    const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const execResult = await agentExecute(result.intent, true);
    if (execResult.toolResult !== undefined) {
      const resultText = formatToolResult(result.intent.toolName, execResult.toolResult as unknown[]);
      const navModule = result.intent.toolName === 'create_task' || result.intent.toolName === 'update_task_status' ? 'tasks'
        : result.intent.toolName === 'get_goals' || result.intent.toolName === 'update_goal_progress' ? 'goals' : undefined;
      const aiMsg: ChatMsg = {
        id: Date.now() + 1, role: 'ai',
        text: `✅ 已执行\n\n${resultText}${execResult.undoToken ? '\n\n💬 说"撤销"可回退此操作' : ''}`,
        time: now, agentIcon: '⚡', toolName: result.intent.toolName,
        toolResult: execResult.toolResult as Record<string, unknown>[],
        actions: navModule ? [{ label: `查看详情 →`, module: navModule, iface: 'workspace' }] : undefined,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } else if (execResult.error) {
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'ai', text: `❌ 执行失败: ${execResult.error}`, time: now, agentIcon: '⚠️' }]);
    }
    scrollToBottom();
  }, [pendingConfirmation, scrollToBottom, setMessages]);

  const handleRejectExecution = useCallback(() => {
    if (!pendingConfirmation) return;
    setPendingConfirmation(null);
    const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'ai', text: '👌 已取消操作。', time: now, agentIcon: '🚫' }]);
    scrollToBottom();
  }, [pendingConfirmation, scrollToBottom, setMessages]);

  // Undo
  const handleUndoRequest = useCallback(async () => {
    const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const result = await undoOperation();
    setMessages((prev) => [...prev, {
      id: Date.now() + 1, role: 'ai',
      text: result.success ? `🔄 ${result.detail}` : `❌ ${result.detail}`,
      time: now, agentIcon: result.success ? '🔄' : '⚠️',
    }]);
    scrollToBottom();
  }, [scrollToBottom, setMessages]);

  // Main send handler — returns chat input state for MainChatView to manage
  async function handleSend(chatInput: string): Promise<string> {
    if (!chatInput.trim() || isTyping) return chatInput;
    const allowed = await checkAiLimit();
    if (!allowed) return chatInput;
    const input = chatInput.trim();
    const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

    // Special: Handle undo
    if (/^撤销$|^undo$|^撤回$/i.test(input)) {
      const userMsg: ChatMsg = { id: Date.now(), role: 'user', text: input, time: now };
      setMessages((prev) => [...prev, userMsg]);
      await handleUndoRequest();
      return '';
    }

    const userMsg: ChatMsg = { id: Date.now(), role: 'user', text: input, time: now };
    setMessages((prev) => [...prev, userMsg]);

    trackEvent('ai_chat', { input_length: input.length, channel: AI_ASSISTANT_CHANNEL });
    createMessage({ channel: AI_ASSISTANT_CHANNEL, content: input, sender_type: 'user', sender_name: user?.name ?? '我' });

    // Agent Loop
    const recentHistory: ConversationTurn[] = messages
      .slice(-6)
      .filter((m) => m.role === 'user' || m.role === 'ai')
      .map((m) => ({ role: m.role === 'user' ? 'user' as const : 'assistant' as const, content: m.text, toolName: m.toolName, intentType: undefined }));

    const intentStartTime = Date.now();
    try {
      const loopResult = await agentPlan(input, recentHistory);
      recordApiCall('intent_parse', Date.now() - intentStartTime, true);

      if (loopResult.requiresConfirmation) {
        const confirmMsg: ChatMsg = {
          id: Date.now() + 1, role: 'ai',
          text: `🔍 操作预览\n\n${loopResult.preview}\n\n确认执行？`,
          time: now, agentIcon: '🔍',
        };
        setMessages((prev) => [...prev, confirmMsg]);
        scrollToBottom();
        setPendingConfirmation({ result: loopResult, chatHistory: recentHistory });
        return '';
      }

      if (!loopResult.intent.fallback && loopResult.toolResult !== undefined) {
        const parsed = loopResult.intent;
        trackEvent('ai_tool_call', { intent: parsed.intent, tool: parsed.toolName });
        const resultText = formatToolResult(parsed.toolName, loopResult.toolResult as unknown[]);
        const intentLabel: Record<string, string> = {
          create_task: '✅ 任务已创建', update_task_status: '✅ 任务已更新',
          query_progress: '📊 查询结果', create_goal: '🎯 目标已创建',
          create_action_item: '🔧 行动项已创建', query_risks: '⚠️ 风险概览',
          query_schedule: '📅 日程查询',
        };
        const navModule = parsed.toolName === 'create_task' || parsed.toolName === 'update_task_status' ? 'tasks'
          : parsed.toolName === 'get_goals' || parsed.toolName === 'update_goal_progress' ? 'goals'
          : parsed.toolName === 'get_tasks' ? 'tasks' : undefined;
        const aiMsg: ChatMsg = {
          id: Date.now() + 1, role: 'ai',
          text: `${intentLabel[parsed.intent] ?? '✅ 操作完成'}\n\n${resultText}`,
          time: now, agentIcon: '⚡', toolName: parsed.toolName,
          toolResult: loopResult.toolResult as Record<string, unknown>[],
          actions: navModule ? [{ label: `查看详情 →`, module: navModule, iface: 'workspace' }] : undefined,
        };
        setMessages((prev) => [...prev, aiMsg]);
        scrollToBottom();
        createMessage({ channel: AI_ASSISTANT_CHANNEL, content: aiMsg.text, sender_type: 'ai', sender_name: '意图解析' });
        return '';
      }

      if (loopResult.intent.fallback && loopResult.intent.intent !== 'chitchat') {
        setFallbackIntent(loopResult.intent.intent);
        setFallbackRawText(input);
        setFallbackOpen(true);
      }
    } catch (err) {
      console.error('[MainChatView] Agent loop failed, falling back to chat:', err);
      recordApiCall('intent_parse', Date.now() - intentStartTime, false);
      recordError('intent_parse', (err as Error)?.message ?? String(err));
    }

    // Regular Chat
    const matchedAgent = routeToAgent(input);
    setActiveAgent(matchedAgent);
    setIsTyping(true);

    const systemPrompt = matchedAgent
      ? matchedAgent.systemPrompt(cell, industry, dept, undefined, industryRaw, deptRaw)
      : buildSystemPrompt(cell, industry, dept, buildModuleContext(activeModule, {
          tasksTotal: tasks.length,
          tasksOverdue: tasks.filter(t => t.status !== 'done' && new Date(t.due_date ?? '') < new Date()).length,
          goalsTotal: goals.length,
          goalsAtRisk: goals.filter(g => g.status === 'at_risk').length,
          actionItemsOpen: actionItems.filter(a => a.status === 'open').length,
          goalList: goals.map(g => ({ title: g.title, progress: g.progress ?? 0, status: g.status, end_date: g.end_date ?? undefined })),
          atRiskGoals: atRiskGoals.map(g => ({ title: g.title, progress: g.progress ?? 0, end_date: g.end_date ?? undefined })),
          taskList: tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled').slice(0, 15)
            .map(t => ({ title: t.title, status: t.status, priority: t.priority, due_date: t.due_date ?? undefined })),
          overdueTasks: overdueTasks.map(t => ({ title: t.title, due_date: t.due_date!, priority: t.priority })),
          actionItemList: openActionItems.slice(0, 8).map(a => ({ title: a.title, priority: a.priority, status: a.status })),
        }), industryRaw, deptRaw);

    const aiMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.filter((m) => m.role === 'user' || m.role === 'ai')
        .map((m) => ({ role: m.role === 'user' ? 'user' as const : 'assistant' as const, content: m.text })),
      { role: 'user', content: input },
    ];

    const aiMsgId = Date.now() + 1;
    const aiMsg: ChatMsg = {
      id: aiMsgId, role: 'ai', text: '', time: now,
      agent: matchedAgent?.id ?? 'general', agentIcon: matchedAgent?.icon ?? '🧠', streaming: true,
    };
    setMessages((prev) => [...prev, aiMsg]);
    scrollToBottom();

    const abort = new AbortController();
    abortRef.current = abort;
    let fullText = '';
    const callStartTime = Date.now();

    chatCompletion(aiMessages, {
      stream: true, signal: abort.signal,
      harness: { agentId: matchedAgent?.id ?? '_general' }, enableTools: true,
      onChunk: (chunk, done) => {
        if (done) {
          fullText = fullText || chunk;
          setMessages((prev) => prev.map((m) => (m.id === aiMsgId ? { ...m, streaming: false } : m)));
          setIsTyping(false);
          scrollToBottom();
          recordApiCall('ai_chat', Date.now() - callStartTime, true);
          createMessage({ channel: AI_ASSISTANT_CHANNEL, content: fullText, sender_type: 'ai', sender_name: matchedAgent?.name ?? 'AI助手' });
          return;
        }
        fullText += chunk;
        setMessages((prev) => prev.map((m) => m.id === aiMsgId ? { ...m, text: m.text + chunk } : m));
        scrollToBottom();
      },
    }).then((response) => {
      if (response?.agent === 'local') {
        setIsOfflineMode(true);
      } else {
        setIsOfflineMode(false);
      }
    }).catch((err) => {
      if (err?.name === 'AbortError') return;
      recordApiCall('ai_chat', Date.now() - callStartTime, false);
      recordError('ai_chat', err?.message ?? 'Unknown AI error');
      setMessages((prev) => prev.map((m) => m.id === aiMsgId ? { ...m, text: '抱歉，AI服务暂时不可用，请稍后重试。', streaming: false } : m));
      setIsTyping(false);
    });

    return '';
  }

  return {
    isTyping, activeAgent, setActiveAgent,
    fallbackOpen, setFallbackOpen, fallbackIntent, fallbackRawText,
    limitWarning, isOfflineMode, pendingConfirmation,
    overdueTasks, atRiskGoals, openActionItems,
    handleToolAction, handleFallbackSubmit,
    handleConfirmExecution, handleRejectExecution,
    handleSend, checkAiLimit,
  };
}
