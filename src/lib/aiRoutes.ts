/**
 * AI Routes — Three fallback routes for LLM calls.
 *
 * Route 1: Supabase Edge Function (secure — API keys stay server-side)
 * Route 1.5: Supabase RPC proxy (call_llm_proxy — server-side, no Edge deploy needed)
 * Route 2: Direct LLM call (DeepSeek CORS — user-provided API key in localStorage)
 * Route 3: Local intelligent fallback (offline — no API needed, in aiLocalFallback.ts)
 */

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { getActiveModel } from '@/lib/aiPresets';
import type { ChatMessage } from '@/lib/aiService';
import type { AIResponse, StreamCallback } from '@/lib/aiService';
import { getToolSchemas } from '@/lib/aiTools';
import { recordApiCall, recordError } from '@/lib/monitoring';
import { localFallback } from '@/lib/aiLocalFallback';

// Re-export for backward compatibility
export { localFallback } from '@/lib/aiLocalFallback';

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


