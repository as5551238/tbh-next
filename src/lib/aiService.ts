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

// --- Types ---

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  text: string;
  agent?: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

export type StreamCallback = (chunk: string, done: boolean) => void;

export interface HarnessOptions {
  /** Agent ID for harness validation. If omitted, harness is skipped. */
  agentId?: string;
}

// --- Configuration: Multi-model presets ---
// NOTE: API keys are now server-side only (Edge Function proxy).
// The apiKey field is kept for type compatibility but should NOT be populated
// from import.meta.env — that would expose keys in the client bundle.

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
  options?: { stream?: boolean; onChunk?: StreamCallback; signal?: AbortSignal; harness?: HarnessOptions }
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
  // Route priority: Edge Function proxy (secure) > local fallback (offline)
  let route: 'edge' | 'local' = 'local';
  try {
    let response: AIResponse;
    if (isSupabaseConfigured() && supabase) {
      route = 'edge';
      response = await callSupabaseEdge(sanitizedMessages, options);
    } else {
      response = await localFallback(sanitizedMessages);
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
  options?: { stream?: boolean; onChunk?: StreamCallback; signal?: AbortSignal }
): Promise<AIResponse> {
  if (!supabase) return localFallback(messages);

  const activeModel = getActiveModel();
  const useStream = options?.stream && options?.onChunk;

  try {
    // Use streaming via direct fetch to Edge Function for better UX
    if (useStream) {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token ?? '';

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
      const res = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ messages, model: activeModel.model, stream: true }),
        signal: options?.signal,
      });

      if (!res.ok) {
        // Fall back to local on any error
        return localFallback(messages);
      }

      // Parse as SSE stream
      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';

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
              } else if (parsed.choices?.[0]?.delta?.content) {
                const delta = parsed.choices[0].delta.content;
                fullText += delta;
                options.onChunk!(delta, false);
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
        options.onChunk!('', true);
        return { text: fullText, agent: 'edge' };
      }
    }

    // Non-streaming: use supabase client
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: { messages, model: activeModel.model, stream: false },
    });

    if (error || !data?.text) {
      // Edge function failed — fall back to local
      return localFallback(messages);
    }

    return { text: data.text, agent: 'edge', usage: data.usage };
  } catch {
    // Any error — fall back to local
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
