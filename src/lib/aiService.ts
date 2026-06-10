/**
 * AI Service — LLM abstraction layer.
 *
 * Strategy:
 * 1. If VITE_AI_ENDPOINT is configured, call the remote LLM API (OpenAI-compatible).
 * 2. If Supabase is configured, use Supabase Edge Function proxy.
 * 3. Otherwise, fall back to intelligent local generation using matrix cell context.
 */

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { createHarness } from '@/lib/agentHarness';
import { sanitizeInput, validateAIOutput, recordInjectionCheck } from '@/lib/aiSecurity';
import type { MatrixCell } from '@/matrix/data';
import { getToolSchemas, executeToolCall, isValidTool } from '@/lib/aiTools';

// --- Types ---

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  /** OpenAI-format tool_calls on assistant messages */
  tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
  /** tool_call_id on tool-role messages */
  tool_call_id?: string;
}

export interface AIResponse {
  text: string;
  agent?: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
  toolCalls?: Array<{ id: string; name: string; arguments: string }>;
  toolResults?: Array<{ tool_call_id: string; name: string; result: unknown }>;
}

export type StreamCallback = (chunk: string, done: boolean) => void;

export interface HarnessOptions {
  /** Agent ID for harness validation. If omitted, harness is skipped. */
  agentId?: string;
}

// --- Configuration: Multi-model presets ---
// Dev mode: API key from VITE_DEEPSEEK_API_KEY for direct client-side calls.
// Production: API keys stay server-side via Edge Function proxy.

const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY ?? '';

const PROVIDER_ENDPOINTS: Record<string, string> = {
  deepseek: 'https://api.deepseek.com',
  doubao: 'https://ark.cn-beijing.volces.com/api/v3',
  openai: 'https://api.openai.com',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode',
};

export interface AIModelPreset {
  id: string;
  name: string;
  provider: string;
  model: string;
}

export const AI_MODEL_PRESETS: AIModelPreset[] = [
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    provider: 'deepseek',
    model: 'deepseek-chat',
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek R1',
    provider: 'deepseek',
    model: 'deepseek-reasoner',
  },
  {
    id: 'deepseek-v4-pro',
    name: 'DeepSeek V4 Pro',
    provider: 'deepseek',
    model: 'deepseek-v4-pro',
  },
  {
    id: 'doubao-pro-32k',
    name: '豆包 Pro 32K',
    provider: 'doubao',
    model: 'doubao-pro-32k',
  },
  {
    id: 'doubao-pro-128k',
    name: '豆包 Pro 128K',
    provider: 'doubao',
    model: 'doubao-pro-128k',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    model: 'gpt-4o-mini',
  },
  {
    id: 'qwen-plus',
    name: '通义千问 Plus',
    provider: 'qwen',
    model: 'qwen-plus',
  },
];

/** Get a preset by id */
export function getModelPreset(id: string): AIModelPreset | undefined {
  return AI_MODEL_PRESETS.find((p) => p.id === id);
}

/** Default model id — persisted to localStorage */
const DEFAULT_MODEL_ID = 'deepseek-chat';

export function getStoredModelId(): string {
  try {
    return localStorage.getItem('tbh_ai_model') ?? DEFAULT_MODEL_ID;
  } catch {
    return DEFAULT_MODEL_ID;
  }
}

export function setStoredModelId(id: string): void {
  try {
    localStorage.setItem('tbh_ai_model', id);
  } catch {
    // ignore
  }
}

/** Resolve active model from store */
function getActiveModel(): AIModelPreset {
  const id = getStoredModelId();
  return getModelPreset(id) ?? AI_MODEL_PRESETS[0];
}

// --- Core: send chat messages to LLM (with Harness) ---

export async function chatCompletion(
  messages: ChatMessage[],
  options?: { stream?: boolean; onChunk?: StreamCallback; signal?: AbortSignal; harness?: HarnessOptions; enableTools?: boolean }
): Promise<AIResponse> {
  const agentId = options?.harness?.agentId ?? '_general';
  const harness = createHarness(agentId);
  const startTime = Date.now();

  // --- Security: Input sanitization (before harness check) ---
  const lastUserMsg = messages.filter((m) => m.role === 'user').pop()?.content ?? '';
  const sanitizeResult = sanitizeInput(lastUserMsg);
  recordInjectionCheck(sanitizeResult);

  if (sanitizeResult.blocked) {
    const rollback = harness.rollback(`提示注入攻击: ${sanitizeResult.blockReason}`);
    harness.audit({
      agentId,
      input: lastUserMsg.slice(0, 200),
      output: rollback.fallbackOutput,
      route: 'local',
      constraintsViolated: [`INJECTION_BLOCKED: ${sanitizeResult.blockReason}`],
      executionTimeMs: Date.now() - startTime,
      status: 'violation',
    });
    if (options?.onChunk) {
      options.onChunk(rollback.fallbackOutput, true);
    }
    return { text: rollback.fallbackOutput, agent: 'security-blocked' };
  }

  // Replace last user message with sanitized version if warnings exist
  const sanitizedMessages = sanitizeResult.warnings.length > 0
    ? messages.map((m, i) =>
        m.role === 'user' && i === messages.length - 1
          ? { ...m, content: sanitizeResult.sanitized }
          : m
      )
    : messages;

  // --- Harness: Input validation ---
  const inputCheck = harness.validateInput(sanitizeResult.sanitized);
  if (!inputCheck.valid) {
    const rollback = harness.rollback(inputCheck.violations.join('; '));
    harness.audit({
      agentId,
      input: sanitizeResult.sanitized.slice(0, 200),
      output: rollback.fallbackOutput,
      route: 'local',
      constraintsViolated: inputCheck.violations,
      executionTimeMs: Date.now() - startTime,
      status: 'violation',
    });
    if (options?.onChunk) {
      options.onChunk(rollback.fallbackOutput, true);
    }
    return { text: rollback.fallbackOutput, agent: 'harness-blocked' };
  }

  // --- Execute AI call ---
  // Route priority: Edge Function proxy > Direct API (dev) > local fallback (offline)
  let route: 'edge' | 'direct' | 'local' = 'local';
  try {
    let response: AIResponse | null = null;

    if (options?.enableTools && isSupabaseConfigured() && supabase) {
      // === S8.1: Tool-enabled path with execution loop ===
      route = 'edge';
      const tools = getToolSchemas();
      const currentMessages: ChatMessage[] = [...sanitizedMessages];
      const allToolResults: AIResponse['toolResults'] = [];
      const MAX_TOOL_ITERATIONS = 3;
      let loopDone = false;

      for (let i = 0; i < MAX_TOOL_ITERATIONS && !loopDone; i++) {
        // Non-streaming during tool loop — tool-calling rounds produce no user-visible text
        const iterResp = await callSupabaseEdge(currentMessages, {
          stream: false,
          enableTools: true,
          tools,
          signal: options?.signal,
        });

        if (!iterResp.toolCalls || iterResp.toolCalls.length === 0) {
          // No tool calls — this is the final text response
          loopDone = true;
          // Re-call with streaming if user originally requested it
          if (options?.stream && options?.onChunk) {
            response = await callSupabaseEdge(currentMessages, {
              stream: true,
              onChunk: options.onChunk,
              signal: options?.signal,
            });
          } else {
            response = iterResp;
          }
          if (allToolResults.length > 0) {
            response = { ...response, toolResults: allToolResults };
          }
          break;
        }

        // --- Execute tool calls locally ---
        const iterToolResults: Array<{ tool_call_id: string; name: string; result: unknown }> = [];
        for (const tc of iterResp.toolCalls) {
          try {
            const args = JSON.parse(tc.arguments);
            const result = await executeToolCall(tc.name, args);
            iterToolResults.push({ tool_call_id: tc.id, name: tc.name, result });
            allToolResults.push({ tool_call_id: tc.id, name: tc.name, result });
          } catch (err) {
            const errResult = { error: String(err) };
            iterToolResults.push({ tool_call_id: tc.id, name: tc.name, result: errResult });
            allToolResults.push({ tool_call_id: tc.id, name: tc.name, result: errResult });
          }
        }

        // Append assistant message with tool_calls
        currentMessages.push({
          role: 'assistant',
          content: iterResp.text || '',
          tool_calls: iterResp.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: { name: tc.name, arguments: tc.arguments },
          })),
        });

        // Append tool result messages
        for (const tr of iterToolResults) {
          currentMessages.push({
            role: 'tool',
            content: JSON.stringify(tr.result),
            tool_call_id: tr.tool_call_id,
          });
        }

        // If this was the last allowed iteration, force a final text-only call
        if (i === MAX_TOOL_ITERATIONS - 1) {
          response = await callSupabaseEdge(currentMessages, {
            stream: !!options?.stream && !!options?.onChunk,
            onChunk: options?.onChunk,
            signal: options?.signal,
          });
          if (allToolResults.length > 0) {
            response = { ...response, toolResults: allToolResults };
          }
        }
      }

      // Safety net
      if (!response) {
        response = { text: 'AI工具调用处理完成，但未生成文本响应，请重试。', agent: 'edge' };
      }
    } else {
      // === Regular path (no tools) ===
      if (isSupabaseConfigured() && supabase) {
        route = 'edge';
        response = await callSupabaseEdge(sanitizedMessages, options);
        // If edge returned local fallback, try direct LLM
        if (response.agent === 'local' && DEEPSEEK_API_KEY) {
          route = 'direct';
          response = await directLLMFallback(sanitizedMessages);
        }
      } else if (DEEPSEEK_API_KEY) {
        route = 'direct';
        response = await directLLMFallback(sanitizedMessages);
      } else {
        response = await localFallback(sanitizedMessages);
      }
    }

    // --- Security: Output validation (after AI call) ---
    const outputSecurity = validateAIOutput(response.text);
    if (!outputSecurity.valid) {
      const rollback = harness.rollback(`输出安全违规: ${outputSecurity.violations.join('; ')}`);
      harness.audit({
        agentId,
        input: sanitizeResult.sanitized.slice(0, 200),
        output: response.text.slice(0, 200),
        route,
        constraintsViolated: outputSecurity.violations,
        executionTimeMs: Date.now() - startTime,
        tokenUsage: response.usage
          ? { prompt: response.usage.prompt_tokens, completion: response.usage.completion_tokens }
          : undefined,
        status: 'rolled_back',
      });
      return { text: rollback.fallbackOutput, agent: 'security-rollback' };
    }

    // --- Harness: Output validation ---
    const outputCheck = harness.validateOutput(response.text);
    if (!outputCheck.valid) {
      const rollback = harness.rollback(outputCheck.violations.join('; '));
      harness.audit({
        agentId,
        input: sanitizeResult.sanitized.slice(0, 200),
        output: response.text.slice(0, 200),
        route,
        constraintsViolated: outputCheck.violations,
        executionTimeMs: Date.now() - startTime,
        tokenUsage: response.usage
          ? { prompt: response.usage.prompt_tokens, completion: response.usage.completion_tokens }
          : undefined,
        status: 'rolled_back',
      });
      return { text: rollback.fallbackOutput, agent: 'harness-rollback' };
    }

    // --- Harness: Audit success ---
    harness.audit({
      agentId,
      input: sanitizeResult.sanitized.slice(0, 200),
      output: response.text.slice(0, 200),
      route,
      constraintsViolated: [],
      executionTimeMs: Date.now() - startTime,
      tokenUsage: response.usage
        ? { prompt: response.usage.prompt_tokens, completion: response.usage.completion_tokens }
        : undefined,
      status: 'success',
    });

    return response;
  } catch (err) {
    // --- Harness: Audit error ---
    harness.audit({
      agentId,
      input: sanitizeResult.sanitized.slice(0, 200),
      output: String(err),
      route,
      constraintsViolated: [],
      executionTimeMs: Date.now() - startTime,
      status: 'error',
    });
    throw err;
  }
}

// --- Route 1: Supabase Edge Function (secure — API keys stay server-side) ---

async function callSupabaseEdge(
  messages: ChatMessage[],
  options?: {
    stream?: boolean;
    onChunk?: StreamCallback;
    signal?: AbortSignal;
    enableTools?: boolean;
    tools?: ReturnType<typeof getToolSchemas>;
  }
): Promise<AIResponse> {
  if (!supabase) return directLLMFallback(messages);

  const activeModel = getActiveModel();
  const useStream = options?.stream && options?.onChunk;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';

  try {
    // --- Acquire auth token (shared by both paths) ---
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token ?? '';

    // --- Build request body ---
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
      // === Streaming path ===
      const res = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
        signal: options?.signal,
      });

      if (!res.ok) return directLLMFallback(messages);

      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';
        // Accumulate tool_calls from SSE delta chunks (keyed by index)
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

              // Custom Edge Function format: { text: "..." }
              if (parsed.text) {
                fullText += parsed.text;
                options.onChunk!(parsed.text, false);
              }

              // OpenAI delta format — text content
              if (parsed.choices?.[0]?.delta?.content) {
                const delta = parsed.choices[0].delta.content;
                fullText += delta;
                options.onChunk!(delta, false);
              }

              // OpenAI delta format — tool_calls (S8.1)
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

    // === Non-streaming path (direct fetch for full response parsing) ===
    const res = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
      signal: options?.signal,
    });

    if (!res.ok) return directLLMFallback(messages);

    const data = await res.json();

    // Parse tool_calls from Edge Function response (OpenAI-compatible format)
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
      return directLLMFallback(messages);
    }

    return {
      text: data.text ?? '',
      agent: 'edge',
      usage: data.usage,
      toolCalls,
    };
  } catch {
    // Any error — try direct LLM before falling back to local
    return directLLMFallback(messages);
  }
}

// --- Route 2: Direct LLM API call (dev mode — API key in client bundle) ---

async function directLLMFallback(messages: ChatMessage[]): Promise<AIResponse> {
  if (!DEEPSEEK_API_KEY) return localFallback(messages);

  const activeModel = getActiveModel();
  const provider = activeModel.provider;
  const endpoint = PROVIDER_ENDPOINTS[provider] ?? PROVIDER_ENDPOINTS.deepseek;

  try {
    const openaiMessages = messages.map(m => {
      if (m.role === 'tool') return { role: 'assistant' as const, content: m.content };
      return { role: m.role, content: m.content };
    });

    const res = await fetch(`${endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: activeModel.model,
        messages: openaiMessages,
        stream: false,
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn('[aiService] Direct LLM call failed:', res.status, errText);
      return localFallback(messages);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? '';
    const usage = data.usage ? { prompt_tokens: data.usage.prompt_tokens, completion_tokens: data.usage.completion_tokens } : undefined;

    if (!text) return localFallback(messages);

    return { text, agent: 'direct', usage };
  } catch (err) {
    console.warn('[aiService] Direct LLM error:', err);
    return localFallback(messages);
  }
}

// --- Route 3: Local intelligent fallback ---

async function localFallback(messages: ChatMessage[]): Promise<AIResponse> {
  // Extract context from system message and user messages
  const systemMsg = messages.find((m) => m.role === 'system')?.content ?? '';
  const userMsgs = messages.filter((m) => m.role === 'user');
  const lastUserMsg = userMsgs[userMsgs.length - 1]?.content ?? '';

  // Simulate a brief delay for realism
  await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));

  const response = generateLocalResponse(systemMsg, lastUserMsg);

  return { text: response, agent: 'local' };
}

/**
 * Local fallback uses the same context that would be sent to the LLM
 * (cell data, industry, dept) to produce structured responses.
 * This ensures the demo works fully offline.
 */
function generateLocalResponse(systemContext: string, userInput: string): string {
  // Parse key context markers
  const industryMatch = systemContext.match(/行业[：:]\s*(.+)/);
  const deptMatch = systemContext.match(/部门[：:]\s*(.+)/);
  const industry = industryMatch?.[1]?.trim() ?? 'IT';
  const dept = deptMatch?.[1]?.trim() ?? '研发';

  // KPI analysis
  if (/KPI|指标|绩效|目标进度|达成率/i.test(userInput)) {
    return [
      `📊 **${industry} · ${dept} KPI 分析报告**`,
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
    ].join('\n');
  }

  // Risk analysis
  if (/风险|预警|告警|隐患|问题/i.test(userInput)) {
    return [
      `⚠️ **${industry} · ${dept} 风险预警**`,
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
      '💡 **总体风险指数**: 72/100 (偏高)，建议管理层关注前两项。',
    ].join('\n');
  }

  // Workflow / process
  if (/流程|工作流|进度|排期|里程碑/i.test(userInput)) {
    return [
      `📐 **${industry} · ${dept} 工作流进度**`,
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
    ].join('\n');
  }

  // Morning briefing
  if (/晨报|早报|晨间|今天|今日|morning/i.test(userInput)) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
    return [
      `☀️ **晨间播报 — ${dateStr}**`,
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
    ].join('\n');
  }

  // General response
  return [
    `收到！基于「${industry} · ${dept}」的上下文分析：`,
    '',
    '我可以为你提供以下专业分析：',
    '',
    '- 📊 **KPI分析** — 输入"KPI怎么样"查看指标详情',
    '- ⚠️ **风险预警** — 输入"风险预警"查看风险清单',
    '- 📐 **工作流进度** — 输入"工作流进度"查看阶段详情',
    '- ☀️ **晨间播报** — 输入"今日聚焦"查看每日摘要',
    '',
    '也可以直接描述你的问题，我会基于当前业务上下文给出分析建议。',
  ].join('\n');
}

// --- Utility: build system prompt from cell context ---

export function buildSystemPrompt(cell: MatrixCell, industry: string, dept: string): string {
  return [
    `你是「团队业务中台」的AI工作助手，服务于「${industry} · ${dept}」部门。`,
    '',
    '## 当前上下文',
    `- 行业：${industry}`,
    `- 部门：${dept}`,
    `- 晨间播报：${cell.morning}`,
    `- 业务概览：${cell.ribbon}`,
    `- 下一步建议：${cell.nextStep}`,
    '',
    '## KPI 数据',
    ...cell.kpis.map((k) => `- ${k.name}: ${k.value}（目标 ${k.target}，状态 ${k.status === 'good' ? '达标' : k.status === 'warn' ? '告警' : '危险'}，趋势 ${k.trend === 'up' ? '上升' : k.trend === 'down' ? '下降' : '持平'}）`),
    '',
    '## 风险预警',
    ...cell.top3.map((t) => `- [${t.level === 'danger' ? '高' : t.level === 'warn' ? '中' : '低'}] ${t.text}`),
    '',
    '## 工作流',
    ...cell.workflow.map((w, i) => `- ${i === cell.wfCurrent ? '👉 当前' : '  '}) ${w}`),
    '',
    '## 回答原则',
    '1. 基于上述数据给出专业、简洁的分析',
    '2. 优先关注告警和危险项，给出具体建议',
    '3. 使用中文回答，可使用表格和列表增强可读性',
    '4. 如数据不足以回答，明确说明缺少什么信息',
  ].join('\n');
}
