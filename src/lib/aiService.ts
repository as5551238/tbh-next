/**
 * AI Service — LLM abstraction layer.
 *
 * Strategy:
 * 1. If Supabase is configured, use Supabase Edge Function proxy.
 * 2. If VITE_DEEPSEEK_API_KEY available, call direct LLM API.
 * 3. Otherwise, fall back to intelligent local generation using matrix cell context.
 */

import { createHarness } from '@/lib/agentHarness';
import { sanitizeInput, validateAIOutput, recordInjectionCheck } from '@/lib/aiSecurity';
import type { MatrixCell } from '@/matrix/data';
import { getToolSchemas, executeToolCall } from '@/lib/aiTools';
import { DEEPSEEK_API_KEY } from '@/lib/aiPresets';
import { isSupabaseConfigured } from '@/lib/supabase';
import { callSupabaseEdge, callRpcProxy, directLLMFallback } from '@/lib/aiRoutes';
import { recordApiCall, recordError } from '@/lib/monitoring';

// --- Types ---

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
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
  agentId?: string;
}

// Re-export from aiPresets for backward compatibility
export { AI_MODEL_PRESETS, getModelPreset, getStoredModelId, setStoredModelId, getActiveModel } from '@/lib/aiPresets';
export type { AIModelPreset } from '@/lib/aiPresets';

// --- Core: send chat messages to LLM (with Harness) ---

export async function chatCompletion(
  messages: ChatMessage[],
  options?: { stream?: boolean; onChunk?: StreamCallback; signal?: AbortSignal; harness?: HarnessOptions; enableTools?: boolean }
): Promise<AIResponse> {
  const agentId = options?.harness?.agentId ?? '_general';
  const harness = createHarness(agentId);
  const startTime = Date.now();

  // --- Security: Input sanitization ---
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
  let route: 'edge' | 'direct' | 'local' = 'local';
  try {
    let response: AIResponse | null = null;

    if (options?.enableTools && isSupabaseConfigured()) {
      // === Tool-enabled path with execution loop ===
      route = 'edge';
      const tools = getToolSchemas();
      const currentMessages: ChatMessage[] = [...sanitizedMessages];
      const allToolResults: AIResponse['toolResults'] = [];
      const MAX_TOOL_ITERATIONS = 3;
      let loopDone = false;

      for (let i = 0; i < MAX_TOOL_ITERATIONS && !loopDone; i++) {
        const iterResp = await callSupabaseEdge(currentMessages, {
          stream: false,
          enableTools: true,
          tools,
          signal: options?.signal,
        });

        if (!iterResp.toolCalls || iterResp.toolCalls.length === 0) {
          loopDone = true;
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

        currentMessages.push({
          role: 'assistant',
          content: iterResp.text || '',
          tool_calls: iterResp.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: { name: tc.name, arguments: tc.arguments },
          })),
        });

        for (const tr of iterToolResults) {
          currentMessages.push({
            role: 'tool',
            content: JSON.stringify(tr.result),
            tool_call_id: tr.tool_call_id,
          });
        }

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

      if (!response) {
        response = { text: 'AI工具调用处理完成，但未生成文本响应，请重试。', agent: 'edge' };
      }
    } else {
      // === Regular path (no tools) ===
      if (isSupabaseConfigured()) {
        route = 'edge';
        response = await callSupabaseEdge(sanitizedMessages, options);
        // Edge fell through to local → try RPC proxy before direct
        if (response.agent === 'local') {
          route = 'rpc';
          response = await callRpcProxy(sanitizedMessages);
        }
        // RPC also fell through → try direct as last resort
        if (response.agent === 'local' && DEEPSEEK_API_KEY) {
          route = 'direct';
          response = await directLLMFallback(sanitizedMessages);
        }
      } else if (DEEPSEEK_API_KEY) {
        route = 'direct';
        response = await directLLMFallback(sanitizedMessages);
      } else {
        response = await directLLMFallback(sanitizedMessages);
      }
    }

    // --- Security: Output validation ---
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
        tokenUsage: response.usage ? { prompt: response.usage.prompt_tokens, completion: response.usage.completion_tokens } : undefined,
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
        tokenUsage: response.usage ? { prompt: response.usage.prompt_tokens, completion: response.usage.completion_tokens } : undefined,
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
      tokenUsage: response.usage ? { prompt: response.usage.prompt_tokens, completion: response.usage.completion_tokens } : undefined,
      status: 'success',
    });

    recordApiCall(`ai_${route}`, Date.now() - startTime, true);

    return response;
  } catch (err) {
    harness.audit({
      agentId,
      input: sanitizeResult.sanitized.slice(0, 200),
      output: String(err),
      route,
      constraintsViolated: [],
      executionTimeMs: Date.now() - startTime,
      status: 'error',
    });
    recordApiCall(`ai_${route}`, Date.now() - startTime, false);
    recordError('ai_chat', (err as Error)?.message ?? String(err));
    throw err;
  }
}

// --- Utility: build system prompt from cell context ---

export function buildSystemPrompt(cell: MatrixCell, industry: string, dept: string, moduleContext?: string): string {
  const moduleSection = moduleContext
    ? ['', '## 当前页面上下文', moduleContext, '']
    : [];

  return [
    `你是「团队业务中台」的AI工作助手，服务于「${industry} · ${dept}」部门。`,
    '',
    '## 当前上下文',
    `- 行业：${industry}`,
    `- 部门：${dept}`,
    `- 晨间播报：${cell.morning}`,
    `- 业务概览：${cell.ribbon}`,
    `- 下一步建议：${cell.nextStep}`,
    ...moduleSection,
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
    '3. 如果用户当前在某个页面上下文中，优先回应与该页面相关的操作',
    '4. 使用中文回答，可使用表格和列表增强可读性',
    '5. 如数据不足以回答，明确说明缺少什么信息',
  ].join('\n');
}
