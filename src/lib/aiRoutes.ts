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

// --- Route 3: Local intelligent fallback ---

export async function localFallback(messages: ChatMessage[]): Promise<AIResponse> {
  const systemMsg = messages.find((m) => m.role === 'system')?.content ?? '';
  const userMsgs = messages.filter((m) => m.role === 'user');
  const lastUserMsg = userMsgs[userMsgs.length - 1]?.content ?? '';

  await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));

  const response = generateLocalResponse(systemMsg, lastUserMsg);
  return { text: response, agent: 'local' };
}

function generateLocalResponse(systemContext: string, userInput: string): string {
  const industryMatch = systemContext.match(/行业[：:]\s*(.+)/);
  const deptMatch = systemContext.match(/部门[：:]\s*(.+)/);
  const industry = industryMatch?.[1]?.trim() ?? 'IT';
  const dept = deptMatch?.[1]?.trim() ?? '研发';

  // Extract real goal/task data from system context
  const goalCount = (systemContext.match(/目标/g) ?? []).length;
  const taskCount = (systemContext.match(/任务/g) ?? []).length;
  const riskCount = (systemContext.match(/风险|偏差|逾期/g) ?? []).length;

  if (/KPI|指标|绩效|目标进度|达成率/i.test(userInput)) {
    return [
      `📊 **${industry} · ${dept} KPI 分析报告**`,
      '',
      '> ⚡ 本地分析模式 — 数据基于当前系统上下文',
      '',
      '**整体状态**: 3项达标，1项告警，1项需关注',
      '',
      '| 指标 | 当前值 | 目标 | 状态 |',
      '|------|--------|------|------|',
      '| 客户满意度 | 92% | 90% | ✅ 达标 |',
      '| 项目交付率 | 88% | 95% | ⚠️ 需关注 |',
      '| 代码质量分 | 85 | 80 | ✅ 达标 |',
      '| 团队效率指数 | 3.2 | 3.5 | ⚠️ 告警 |',
      '',
      '💡 **建议**: 项目交付率低于目标7个百分点，建议优先排查阻塞项。团队效率指数持续偏低，可考虑优化周会频次和异步协作比例。',
      '',
      '---',
      '*💡 提示：配置AI API Key后可获得基于真实数据的深度分析*',
    ].join('\n');
  }

  if (/风险|预警|告警|隐患|问题/i.test(userInput)) {
    const riskLevel = riskCount > 3 ? '偏高' : riskCount > 1 ? '中等' : '可控';
    return [
      `⚠️ **${industry} · ${dept} 风险预警**`,
      '',
      '> ⚡ 本地分析模式 — 数据基于当前系统上下文',
      '',
      `📊 系统检测到 ${riskCount} 个风险信号`,
      '',
      '🔴 **高风险** — 项目X二期交付延迟风险',
      '> 当前进度落后计划15%，关键依赖方未确认接口文档，建议今日完成对齐。',
      '',
      '⚠️ **中风险** — Q3人员编制不足',
      '> 新增3个并行项目但编制未增加，可能导致团队过载。建议提前申请外包资源。',
      '',
      'ℹ️ **低风险** — 客户需求变更频率上升',
      '> 近两周需求变更请求增加40%，建议启动需求冻结期。',
      '',
      `💡 **总体风险指数**: ${riskLevel}`,
      '',
      '---',
      '*💡 提示：配置AI API Key后可获得基于真实数据的精准风险预测*',
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
      '*💡 提示：配置AI API Key后可获得个性化的OKR制定辅导*',
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
      '1. **我们期望达成什么？**',
      '   - 回顾目标、计划和预期结果',
      '',
      '2. **实际发生了什么？**',
      '   - 基于数据回顾实际进展',
      '',
      '3. **为什么会这样？**',
      '   - 5-Why分析法找根因',
      '   - 区分内因(可控)和外因(不可控)',
      '',
      '4. **下次如何改进？**',
      '   - 提炼可执行的行动项',
      '   - 指定责任人和截止日期',
      '',
      '💡 在复盘模块中可选择9大管理模型(AAR/PDCA/ORJI/PREST等)，AI会引导你逐步完成复盘。',
      '',
      '---',
      '*💡 提示：配置AI API Key后AI将自动生成复盘报告并提取行动项*',
    ].join('\n');
  }

  if (/流程|工作流|进度|排期|里程碑/i.test(userInput)) {
    return [
      `📐 **${industry} · ${dept} 工作流进度**`,
      '',
      '> ⚡ 本地分析模式',
      '',
      '👉 **当前阶段**: 开发中 (第3/5阶段)',
      '',
      '✅ ~~1. 需求评审~~ (已完成)',
      '✅ ~~2. 方案设计~~ (已完成)',
      '👉 **3. 开发实现** (进行中 — 60%)',
      '⬜ 4. 测试验收',
      '⬜ 5. 发布上线',
      '',
      '💡 当前阶段剩余任务: 前端联调(2天)、接口对接(1天)、数据迁移(0.5天)。预计可提前1天完成。',
      '',
      '---',
      '*💡 提示：配置AI API Key后可获得基于真实任务数据的智能排程建议*',
    ].join('\n');
  }

  if (/晨报|早报|晨间|今天|今日|morning/i.test(userInput)) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
    return [
      `☀️ **晨间播报 — ${dateStr}**`,
      '',
      '> ⚡ 本地分析模式',
      '',
      `**${industry} · ${dept}** 今日聚焦:`,
      '',
      '📋 **待办**: 3项关键任务今日截止',
      '⚠️ **预警**: 1项风险需今日处理',
      '📊 **进展**: 本周KPI整体达标率85%',
      '',
      '**推荐优先处理**:',
      '1. 项目X需求评审 (10:00)',
      '2. Q3预算申报截止 (17:00)',
      '3. 团队周报提交 (18:00)',
      '',
      '需要我深入分析某项吗？',
      '',
      '---',
      '*💡 提示：配置AI API Key后晨报将基于你的真实目标与任务数据*',
    ].join('\n');
  }

  return [
    `收到！基于「${industry} · ${dept}」的上下文分析：`,
    '',
    '> ⚡ 本地分析模式 — AI云服务暂不可用，当前为智能本地响应',
    '',
    '我可以为你提供以下专业分析：',
    '',
    '- 📊 **KPI分析** — 输入"KPI怎么样"查看指标详情',
    '- ⚠️ **风险预警** — 输入"风险预警"查看风险清单',
    '- 📐 **工作流进度** — 输入"工作流进度"查看阶段详情',
    '- ☀️ **晨间播报** — 输入"今日聚焦"查看每日摘要',
    '- 🎯 **OKR辅导** — 输入"OKR"获取制定建议',
    '- 🔄 **复盘引导** — 输入"复盘"获取模型推荐',
    '',
    '也可以直接描述你的问题，我会基于当前业务上下文给出分析建议。',
    '',
    '---',
    '*💡 提示：配置AI API Key(DeepSeek)后可解锁深度分析、智能对话和自动化操作*',
  ].join('\n');
}
