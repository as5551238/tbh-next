/**
 * AI Routes — Three fallback routes for LLM calls.
 *
 * Route 1: Supabase Edge Function (secure — API keys stay server-side)
 * Route 1.5: Supabase RPC proxy (call_llm_proxy — server-side, no Edge deploy needed)
 * Route 3: Local intelligent fallback (offline — no API needed)
 *
 * Route 2 (Direct LLM API call) was removed for security:
 * it exposed the API key in the client bundle.
 */

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { getActiveModel } from '@/lib/aiPresets';
import type { ChatMessage } from '@/lib/aiService';
import type { AIResponse, StreamCallback } from '@/lib/aiService';
import { getToolSchemas } from '@/lib/aiTools';
import { recordApiCall, recordError } from '@/lib/monitoring';

// --- Route 1: Supabase Edge Function ---

export async function callSupabaseEdge(
  messages: ChatMessage[],
  options?: {
    stream?: boolean;
    onChunk?: StreamCallback;
    signal?: AbortSignal;
    enableTools?: boolean;
    tools?: ReturnType<typeof getToolSchemas>;
  }
): Promise<AIResponse> {
  if (!supabase) return localFallback(messages);

  const activeModel = getActiveModel();
  const useStream = options?.stream && options?.onChunk;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token ?? '';

    const body: Record<string, unknown> = {
      messages,
      model: activeModel.model,
      stream: !!useStream,
      enableTools: options?.enableTools ?? false,
    };
    if (options?.tools && options.tools.length > 0) {
      body.tools = options.tools;
    }

    if (useStream) {
      const res = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify(body),
        signal: options?.signal,
      });

      if (!res.ok) return callRpcProxy(messages);

      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';
        const toolCallMap = new Map<number, { id: string; name: string; arguments: string }>();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') {
              options.onChunk!('', true);
              break;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                fullText += parsed.text;
                options.onChunk!(parsed.text, false);
              }
              if (parsed.choices?.[0]?.delta?.content) {
                const delta = parsed.choices[0].delta.content;
                fullText += delta;
                options.onChunk!(delta, false);
              }
              if (parsed.choices?.[0]?.delta?.tool_calls) {
                for (const tc of parsed.choices[0].delta.tool_calls) {
                  const idx = tc.index ?? 0;
                  const existing = toolCallMap.get(idx) ?? { id: '', name: '', arguments: '' };
                  if (tc.id) existing.id = tc.id;
                  if (tc.function?.name) existing.name += tc.function.name;
                  if (tc.function?.arguments) existing.arguments += tc.function.arguments;
                  toolCallMap.set(idx, existing);
                }
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
        options.onChunk!('', true);

        const toolCalls = toolCallMap.size > 0
          ? Array.from(toolCallMap.values()).filter((tc) => tc.name)
          : undefined;

        return { text: fullText, agent: 'edge', toolCalls };
      }
    }

    // Non-streaming path
    const res = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify(body),
      signal: options?.signal,
    });

    if (!res.ok) return callRpcProxy(messages);

    const data = await res.json();

    let toolCalls: AIResponse['toolCalls'];
    if (Array.isArray(data.tool_calls) && data.tool_calls.length > 0) {
      toolCalls = data.tool_calls.map((tc: Record<string, unknown>) => ({
        id: (tc.id as string) ?? `tc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: ((tc.function as Record<string, unknown>)?.name as string) ?? (tc.name as string) ?? '',
        arguments: typeof (tc.function as Record<string, unknown>)?.arguments === 'string'
          ? (tc.function as Record<string, unknown>).arguments as string
          : JSON.stringify((tc.function as Record<string, unknown>)?.arguments ?? {}),
      }));
    }

    if (!data?.text && (!toolCalls || toolCalls.length === 0)) {
      return callRpcProxy(messages);
    }

    return { text: data.text ?? '', agent: 'edge', usage: data.usage, toolCalls };
  } catch (err) {
    recordError('ai_edge', (err as Error)?.message ?? String(err));
    return callRpcProxy(messages);
  }
}

// --- Route 1.5: Supabase RPC proxy (call_llm_proxy) ---

/**
 * Call LLM via Supabase RPC function `call_llm_proxy`.
 * This keeps API keys server-side without needing Edge Function deployment.
 * Requires: DB function `call_llm_proxy(messages jsonb, model text)` deployed in Supabase.
 */
export async function callRpcProxy(messages: ChatMessage[]): Promise<AIResponse> {
  if (!supabase || !isSupabaseConfigured()) return localFallback(messages);

  const activeModel = getActiveModel();
  const rpcMessages = messages.map((m) => ({
    role: m.role === 'tool' ? 'assistant' : m.role,
    content: m.content,
  }));

  try {
    const { data, error } = await supabase.rpc('call_llm_proxy', {
      p_messages: rpcMessages,
      p_model: activeModel.model,
    });

    if (error) {
      console.warn('[aiRoutes] RPC proxy error:', error.message);
      recordError('ai_rpc', error.message);
      return localFallback(messages);
    }

    // RPC returns { text, usage? }
    const text = data?.text ?? data?.choices?.[0]?.message?.content ?? '';
    if (!text) {
      console.warn('[aiRoutes] RPC proxy returned empty text');
      return localFallback(messages);
    }

    const usage = data?.usage
      ? { prompt_tokens: data.usage.prompt_tokens, completion_tokens: data.usage.completion_tokens }
      : undefined;

    return { text, agent: 'rpc', usage };
  } catch (err) {
    console.warn('[aiRoutes] RPC proxy exception:', err);
    recordError('ai_rpc', (err as Error)?.message ?? String(err));
    return localFallback(messages);
  }
}

// --- Route 2: Client-side direct LLM call (DeepSeek supports CORS) ---

/**
 * Call LLM directly from browser. DeepSeek API supports CORS, so this works
 * without Edge Function or server-side proxy. API key read from localStorage
 * (user configures it in AI Settings page).
 *
 * Security note: The key is stored in localStorage (not bundled), and only
 * sent to the official DeepSeek API endpoint. This is acceptable for a
 * personal/team tool where the user explicitly provides their own key.
 */
export async function callDirectLLM(
  messages: ChatMessage[],
  options?: { stream?: boolean; onChunk?: StreamCallback; signal?: AbortSignal; enableTools?: boolean; tools?: ReturnType<typeof getToolSchemas> }
): Promise<AIResponse> {
  const apiKey = localStorage.getItem('tbh_deepseek_api_key');
  if (!apiKey) return localFallback(messages);

  const activeModel = getActiveModel();
  const model = activeModel.model.startsWith('deepseek') ? activeModel.model : 'deepseek-chat';
  const endpoint = 'https://api.deepseek.com/chat/completions';

  const body: Record<string, unknown> = {
    model,
    messages: messages.map(m => ({
      role: m.role === 'tool' ? 'assistant' : m.role,
      content: m.content,
    })),
    max_tokens: 1024,
    stream: false,
  };

  if (options?.enableTools && options.tools && options.tools.length > 0) {
    body.tools = options.tools;
    body.tool_choice = 'auto';
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: options?.signal,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errMsg = (errData as Record<string, unknown>)?.error
        ? ((errData as Record<string, unknown>).error as Record<string, unknown>)?.message ?? res.statusText
        : res.statusText;

      // Insufficient balance — return clear message, don't fall through to generic error
      if (/insufficient balance/i.test(String(errMsg))) {
        return {
          text: '⚠️ DeepSeek API 余额不足，请充值后重试。当前使用本地智能分析模式。',
          agent: 'local',
        };
      }

      console.warn('[aiRoutes] Direct LLM error:', errMsg);
      recordError('ai_direct', String(errMsg));
      return localFallback(messages);
    }

    const data = await res.json();

    let toolCalls: AIResponse['toolCalls'];
    if (Array.isArray(data.choices?.[0]?.message?.tool_calls)) {
      toolCalls = data.choices[0].message.tool_calls.map((tc: Record<string, unknown>) => ({
        id: (tc.id as string) ?? `tc_${Date.now()}`,
        name: ((tc.function as Record<string, unknown>)?.name as string) ?? '',
        arguments: typeof (tc.function as Record<string, unknown>)?.arguments === 'string'
          ? (tc.function as Record<string, unknown>).arguments as string
          : JSON.stringify((tc.function as Record<string, unknown>)?.arguments ?? {}),
      }));
    }

    const text = data.choices?.[0]?.message?.content ?? '';

    return {
      text,
      agent: 'direct',
      usage: data.usage ? { prompt_tokens: data.usage.prompt_tokens, completion_tokens: data.usage.completion_tokens } : undefined,
      toolCalls,
    };
  } catch (err) {
    console.warn('[aiRoutes] Direct LLM exception:', err);
    recordError('ai_direct', (err as Error)?.message ?? String(err));
    return localFallback(messages);
  }
}

// --- Route 3: Local intelligent fallback (with real data from aiTools) ---

import { executeToolCall } from '@/lib/aiTools';

export async function localFallback(messages: ChatMessage[]): Promise<AIResponse> {
  const systemMsg = messages.find((m) => m.role === 'system')?.content ?? '';
  const userMsgs = messages.filter((m) => m.role === 'user');
  const lastUserMsg = userMsgs[userMsgs.length - 1]?.content ?? '';

  await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));

  // --- Try to load real data from Supabase via aiTools ---
  let metrics: Record<string, unknown> | null = null;
  let alerts: Record<string, unknown> | null = null;
  let schedule: ScheduleEvent[] | null = null;

  try {
    const [m, a, s] = await Promise.all([
      executeToolCall('get_team_metrics', {}).catch(() => null),
      executeToolCall('get_deviation_alerts', {}).catch(() => null),
      executeToolCall('get_schedule_events', { days_ahead: 7 }).catch(() => null),
    ]);
    metrics = m as Record<string, unknown> | null;
    alerts = a as Record<string, unknown> | null;
    schedule = (s as ScheduleEvent[] | null) ?? null;
  } catch {
    // Data not available, fall through to static response
  }

  const response = generateLocalResponse(systemMsg, lastUserMsg, metrics, alerts, schedule);
  return { text: response, agent: 'local' };
}

interface DeviationAlerts {
  overdueTasks?: Array<{ id: string; title: string; due_date: string | null; priority: string }>;
  openRisks?: Array<{ id: string; title: string; severity: string; status: string }>;
  totalAlerts?: number;
}

interface ScheduleEvent {
  id: string; title: string; due_date: string | null; priority: string; status: string; goal_id: string | null;
}

function generateLocalResponse(
  systemContext: string,
  userInput: string,
  metrics: Record<string, unknown> | null,
  alerts: DeviationAlerts | null,
  schedule: ScheduleEvent[] | null,
): string {
  const industryMatch = systemContext.match(/行业[：:]\s*(.+)/);
  const deptMatch = systemContext.match(/部门[：:]\s*(.+)/);
  const industry = industryMatch?.[1]?.trim() ?? 'IT';
  const dept = deptMatch?.[1]?.trim() ?? '研发';

  const hasRealData = metrics !== null && (metrics.goalCount as number) > 0;

  if (/KPI|指标|绩效|目标进度|达成率/i.test(userInput)) {
    if (hasRealData) {
      const goalRate = metrics.goalCompletionRate as number;
      const taskRate = metrics.taskCompletionRate as number;
      const actionCloseRate = metrics.actionItemCloseRate as number;
      const overdue = metrics.overdueTasks as number;
      const atRisk = metrics.atRiskGoals as number;
      const goalCount = metrics.goalCount as number;
      const taskCount = metrics.taskCount as number;

      return [
        `📊 **${industry} · ${dept} KPI 实时分析**`,
        '',
        `> 📡 基于实时数据 — ${goalCount}个目标, ${taskCount}个任务`,
        '',
        '**整体达成率**:',
        '',
        `| 指标 | 当前值 | 状态 |`,
        `|------|--------|------|`,
        `| 目标完成率 | ${goalRate}% | ${goalRate >= 80 ? '✅ 良好' : goalRate >= 50 ? '⚠️ 需关注' : '🔴 需行动'} |`,
        `| 任务完成率 | ${taskRate}% | ${taskRate >= 80 ? '✅ 良好' : taskRate >= 50 ? '⚠️ 需关注' : '🔴 需行动'} |`,
        `| 行动项关闭率 | ${actionCloseRate}% | ${actionCloseRate >= 70 ? '✅ 良好' : '⚠️ 需关注'} |`,
        `| 逾期任务 | ${overdue}项 | ${overdue === 0 ? '✅ 无逾期' : '🔴 需处理'} |`,
        `| 风险目标 | ${atRisk}个 | ${atRisk === 0 ? '✅ 可控' : '⚠️ 需关注'} |`,
        '',
        overdue > 0 ? `🔴 **${overdue}项任务已逾期**，建议优先处理逾期任务释放阻塞。` : '',
        atRisk > 0 ? `⚠️ **${atRisk}个目标偏离风险**，进度低于50%且临近截止日。` : '',
        goalRate >= 80 && taskRate >= 80 ? '✅ 整体表现良好，保持当前节奏。' : '',
        '',
        '---',
        '*💡 配置AI API Key后可获得深度归因分析和改进建议*',
      ].filter(Boolean).join('\n');
    }

    return [
      `📊 **${industry} · ${dept} KPI 分析报告**`,
      '',
      '> ⚡ 本地分析模式 — 暂无活跃目标数据',
      '',
      '当前系统尚未录入目标和任务数据。建议：',
      '',
      '1. 在**目标模块**中创建团队季度目标',
      '2. 在**任务模块**中为每个目标分配关键任务',
      '3. 系统将自动计算完成率和偏差指标',
      '',
      '创建后再次查询即可获得实时KPI分析。',
      '',
      '---',
      '*💡 配置AI API Key后可获得基于真实数据的深度分析*',
    ].join('\n');
  }

  if (/风险|预警|告警|隐患|问题/i.test(userInput)) {
    if (alerts && alerts.totalAlerts !== undefined && alerts.totalAlerts > 0) {
      const overdueList = alerts.overdueTasks ?? [];
      const riskList = alerts.openRisks ?? [];
      return [
        `⚠️ **${industry} · ${dept} 风险预警 — 实时数据**`,
        '',
        `> 📡 共 ${alerts.totalAlerts} 项需关注`,
        '',
        overdueList.length > 0 ? [
          '**🔴 逾期任务**:',
          ...overdueList.slice(0, 5).map((t) =>
            `- **${t.title}** (优先级: ${t.priority}, 截止: ${t.due_date ?? '未设置'})`
          ),
          '',
        ].join('\n') : '',
        riskList.length > 0 ? [
          '**⚠️ 开放风险**:',
          ...riskList.slice(0, 5).map((r) =>
            `- **${r.title}** (严重度: ${r.severity}, 状态: ${r.status})`
          ),
          '',
        ].join('\n') : '',
        '💡 **建议**: 优先处理逾期任务和高级别风险，确保对关键目标无冲击。',
        '',
        '---',
        '*💡 配置AI API Key后可获精准风险预测和处置建议*',
      ].filter(Boolean).join('\n');
    }

    return [
      `⚠️ **${industry} · ${dept} 风险检查**`,
      '',
      '> 📡 实时数据 — 当前无活跃预警',
      '',
      alerts !== null ? '好消息！当前没有逾期任务或开放风险。继续保持。' : '暂无可用数据。请先录入任务和风险信息。',
      '',
      '---',
      '*💡 配置AI API Key后可获得智能风险预测*',
    ].join('\n');
  }

  if (/日程|安排|今天|今日|morning|晨报|早报|晨间/i.test(userInput)) {
    if (schedule && schedule.length > 0) {
      const now = new Date();
      const dateStr = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
      const urgent = schedule.filter(e => e.priority === 'urgent' || e.priority === 'high');
      const normal = schedule.filter(e => e.priority !== 'urgent' && e.priority !== 'high');
      return [
        `📅 **${industry} · ${dept} 近期安排 — ${dateStr}**`,
        '',
        `> 📡 ${schedule.length} 项待办` + (urgent.length > 0 ? `，其中 ${urgent.length} 项紧急/高优先级` : ''),
        '',
        urgent.length > 0 ? [
          '**🔥 紧急/高优先级**:',
          ...urgent.slice(0, 5).map((e) =>
            `- **${e.title}** — 截止: ${e.due_date ?? '未设置'} (状态: ${e.status})`
          ),
          '',
        ].join('\n') : '',
        normal.length > 0 ? [
          '**📋 常规待办**:',
          ...normal.slice(0, 5).map((e, i) =>
            `${i + 1}. ${e.title} — 截止: ${e.due_date ?? '未设置'} (优先级: ${e.priority})`
          ),
          '',
        ].join('\n') : '',
        urgent.length > 0 ? '⚠️ 建议优先处理紧急任务，可以说"把XX任务改为进行中"来更新状态。' : '💡 需要调整安排可以直接说"把XX任务改为高优先级"。',
        '',
        '---',
        '*💡 配置AI API Key后可获得智能排程建议*',
      ].join('\n');
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
    return [
      `☀️ **晨间播报 — ${dateStr}**`,
      '',
      '> ⚡ 本地分析模式 — 暂无待办安排',
      '',
      '当前没有即将到期的任务。建议在任务模块中创建并设置截止日期。',
      '',
      '---',
      '*💡 配置AI API Key后晨报将基于你的真实目标与任务数据*',
    ].join('\n');
  }

  if (/OKR|目标管理|objectives|key result/i.test(userInput)) {
    return [
      `🎯 **${industry} · ${dept} OKR 分析建议**`,
      '',
      '> ⚡ 本地分析模式',
      '',
      '**OKR制定框架**:',
      '',
      '1. **Objective（目标）**: 定性描述期望达成的方向',
      '   - 示例: "提升产品用户体验，成为行业标杆"',
      '',
      '2. **Key Results（关键结果）**: 2-5条可量化的衡量标准',
      '   - 示例: "用户满意度从85%提升至92%"',
      '   - 示例: "核心功能响应时间减少50%"',
      '',
      '3. **对齐检查**:',
      '   - 个人KR是否支撑团队O？',
      '   - 团队O是否支撑公司战略？',
      '   - KR是否符合SMART原则？',
      '',
      '4. **追踪节奏**:',
      '   - 周度：进度更新(Check-in)',
      '   - 月度：偏差复盘',
      '   - 季度/赛季：评分+下一轮OKR制定',
      '',
      '💡 建议在DSTE模块中创建OKR赛季，系统会自动追踪进度和对齐情况。',
      '',
      '---',
      '*💡 配置AI API Key后可获得个性化的OKR制定辅导*',
    ].join('\n');
  }

  if (/复盘|回顾|retrospect|review/i.test(userInput)) {
    return [
      `🔄 **${industry} · ${dept} 复盘引导**`,
      '',
      '> ⚡ 本地分析模式',
      '',
      '**推荐复盘模型**: AAR (After Action Review)',
      '',
      '**四步走**:',
      '',
      '1. **我们期望达成什么？** — 回顾目标、计划和预期结果',
      '2. **实际发生了什么？** — 基于数据回顾实际进展',
      '3. **为什么会这样？** — 5-Why分析法找根因',
      '4. **下次如何改进？** — 提炼可执行的行动项',
      '',
      '💡 在复盘模块中可选择9大管理模型(AAR/PDCA/ORJI/PREST等)，AI会引导你逐步完成复盘。',
      '',
      '---',
      '*💡 配置AI API Key后AI将自动生成复盘报告并提取行动项*',
    ].join('\n');
  }

  if (/流程|工作流|排期|里程碑/i.test(userInput)) {
    if (hasRealData) {
      const taskCount = metrics.taskCount as number;
      const taskRate = metrics.taskCompletionRate as number;
      const overdue = metrics.overdueTasks as number;
      return [
        `📐 **${industry} · ${dept} 工作流进度**`,
        '',
        `> 📡 实时数据 — ${taskCount}个任务, 完成${taskRate}%`,
        '',
        overdue > 0 ? `🔴 **${overdue}项逾期任务** 需关注` : '✅ 无逾期任务',
        '',
        '---',
        '*💡 配置AI API Key后可获得基于真实任务数据的智能排程建议*',
      ].join('\n');
    }

    return [
      `📐 **${industry} · ${dept} 工作流进度**`,
      '',
      '> ⚡ 本地分析模式 — 暂无任务数据',
      '',
      '建议先在任务模块中创建任务并关联到目标，系统会自动追踪进度。',
      '',
      '---',
      '*💡 配置AI API Key后可获得智能排程建议*',
    ].join('\n');
  }

  // Default response with data summary if available
  const dataHint = hasRealData
    ? `当前系统有 ${metrics!.goalCount}个目标、${metrics!.taskCount}个任务。你可以查询"KPI""风险""日程"等获取实时分析。`
    : '建议先创建目标和任务，然后我可以基于真实数据给出分析。';

  return [
    `收到！基于「${industry} · ${dept}」的上下文：`,
    '',
    `> ${hasRealData ? '📡 实时数据可用' : '⚡ 本地分析模式'}`,
    '',
    dataHint,
    '',
    '快速指令：',
    '- 📊 "KPI怎么样" — 实时指标分析',
    '- ⚠️ "风险预警" — 逾期与风险检查',
    '- 📅 "今天有什么" — 近期安排',
    '- 🎯 "OKR" — 目标制定辅导',
    '- 🔄 "复盘" — 复盘模型推荐',
    '',
    '---',
    '*💡 配置AI API Key后可解锁深度对话与自动化操作*',
  ].join('\n');
}
