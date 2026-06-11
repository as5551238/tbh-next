/**
 * AI Model Presets — Multi-provider model configuration.
 *
 * SECURITY: API keys are NEVER exposed to the client bundle.
 * All LLM calls go through Supabase Edge Function or RPC proxy,
 * keeping API keys server-side only. Local fallback is used when
 * no server-side route is available.
 */

export interface AIModelPreset {
  id: string;
  name: string;
  provider: string;
  model: string;
}

export const AI_MODEL_PRESETS: AIModelPreset[] = [
  { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'deepseek', model: 'deepseek-chat' },
  { id: 'deepseek-reasoner', name: 'DeepSeek R1', provider: 'deepseek', model: 'deepseek-reasoner' },
  { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', provider: 'deepseek', model: 'deepseek-v4-pro' },
  { id: 'doubao-pro-32k', name: '豆包 Pro 32K', provider: 'doubao', model: 'doubao-pro-32k' },
  { id: 'doubao-pro-128k', name: '豆包 Pro 128K', provider: 'doubao', model: 'doubao-pro-128k' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', model: 'gpt-4o-mini' },
  { id: 'qwen-plus', name: '通义千问 Plus', provider: 'qwen', model: 'qwen-plus' },
];

const DEFAULT_MODEL_ID = 'deepseek-chat';

/** Get a preset by id */
export function getModelPreset(id: string): AIModelPreset | undefined {
  return AI_MODEL_PRESETS.find((p) => p.id === id);
}

/** Get stored model id from localStorage */
export function getStoredModelId(): string {
  try {
    return localStorage.getItem('tbh_ai_model') ?? DEFAULT_MODEL_ID;
  } catch {
    return DEFAULT_MODEL_ID;
  }
}

/** Persist model id to localStorage */
export function setStoredModelId(id: string): void {
  try {
    localStorage.setItem('tbh_ai_model', id);
  } catch {
    // ignore
  }
}

/** Resolve active model from store */
export function getActiveModel(): AIModelPreset {
  const id = getStoredModelId();
  return getModelPreset(id) ?? AI_MODEL_PRESETS[0];
}
