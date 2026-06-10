/**
 * Intent Parser — Natural Language → Structured Intent → Tool Execution.
 *
 * Paradigm shift: "对话即操作" (Conversation-as-Action).
 * User speaks naturally → we extract intent → execute via aiTools → refresh UI.
 *
 * Architecture (v2 — Token-efficient):
 * - L0 快速路径: 本地关键词匹配, 零 Token 消耗
 * - L1 AI 路径: 仅在 L0 无法确定时调用, 1 次 AI 调用
 * - L2 兜底路径: AI 置信度低 → 显示表单, 0 Token 额外消耗
 *
 * Fallback: When parsing fails, returns a fallback flag so UI can show a form.
 */

import { executeToolCall, isValidTool } from '@/lib/aiTools';

// --- Types ---

export type IntentType = 'create_task' | 'update_task' | 'query_progress' | 'create_goal' | 'chitchat' | 'unknown';

export interface ParsedIntent {
  intent: IntentType;
  confidence: number;       // 0-1
  toolName: string;         // aiTools function name
  params: Record<string, unknown>;
  fallback: boolean;        // true = parsing failed, show form
  rawText: string;
}

export interface IntentResult {
  intent: ParsedIntent;
  toolResult?: unknown;
  error?: string;
}

// --- Registry-based Intent → Tool mapping ---

interface IntentRegistration {
  toolName: string;
  keywords: RegExp[];
  extractParams: (text: string) => Record<string, unknown>;
}

const INTENT_REGISTRY: Record<Exclude<IntentType, 'unknown'>, IntentRegistration> = {
  create_task: {
    toolName: 'create_task',
    keywords: [
      /(?:创建|新建|添加|建一个|帮我做一个|设置一个|新增).*(?:任务|项目|工作|事情|待办|事项)/,
      /(?:创建|新建|添加).*(?:跟进|处理|完成|推进|检查)/,
    ],
    extractParams: (text) => {
      const params: Record<string, unknown> = {};
      // Extract title: remove command prefixes
      let title = text
        .replace(/^(帮我|请)?(创建|新建|添加|建一个|帮我做一个|设置一个|新增)\s*/g, '')
        .replace(/(任务|项目|工作|事情|待办|事项)\s*$/, '')
        .replace(/[，。！？,.!]*$/, '')
        .trim();
      if (title) params.title = title;

      // Extract priority
      if (/紧急|urgent/i.test(text)) params.priority = 'urgent';
      else if (/高优先|重要|high/i.test(text)) params.priority = 'high';
      else if (/低优先|不急|low/i.test(text)) params.priority = 'low';
      else params.priority = 'medium';

      // Extract due date references
      const dateRef = text.match(/(今天|明天|后天|下周一|下周二|下周三|下周四|下周五|本周[一二三四五]|这周[一二三四五]|下个月|\d{4}-\d{2}-\d{2})/);
      if (dateRef) {
        const resolved = resolveNaturalDate(dateRef[1]);
        if (resolved) params.due_date = resolved;
      }

      return params;
    },
  },
  update_task: {
    toolName: 'update_task_status',
    keywords: [
      /(?:修改|更新|编辑|改).*(?:任务|状态|优先级)/,
      /(?:标记|完成|结束|关闭).*(?:任务|工作)/,
      /(?:任务|工作).*(?:开始了|进行中|完成了|结束了|暂停|阻塞|取消)/,
    ],
    extractParams: (text) => {
      const params: Record<string, unknown> = {};
      if (/完成|结束|关闭|done/i.test(text)) params.status = 'done';
      else if (/开始|进行中|in_progress/i.test(text)) params.status = 'in_progress';
      else if (/暂停|阻塞|blocked/i.test(text)) params.status = 'blocked';
      else if (/取消|cancel/i.test(text)) params.status = 'cancelled';
      else params.status = 'todo';

      // Try to extract task reference
      const taskRef = text.match(/["""]([^"""]+)["""]|任务\s*[:：]?\s*(\S+)/);
      if (taskRef) params.task_id = taskRef[1] || taskRef[2];

      return params;
    },
  },
  query_progress: {
    toolName: 'get_team_metrics',
    keywords: [
      /(?:查询|查看|了解|看看|怎么样|报告|汇报).*(?:进度|状态|情况|数据|报表|周报|概览)/,
      /(?:项目|团队|目标|任务).*(?:怎么样|什么情况|进展)/,
      /今天.*干了什么|今日.*工作/,
    ],
    extractParams: () => ({}),
  },
  create_goal: {
    toolName: 'update_goal_progress',  // placeholder, will add create_goal tool
    keywords: [
      /(?:创建|新建|设定|制定).*(?:目标|OKR|KR|关键结果)/,
    ],
    extractParams: (text) => {
      const params: Record<string, unknown> = {};
      let title = text
        .replace(/^(帮我|请)?(创建|新建|设定|制定)\s*/g, '')
        .replace(/(目标|OKR|KR|关键结果)\s*$/, '')
        .replace(/[，。！？,.!]*$/, '')
        .trim();
      if (title) params.title = title;
      return params;
    },
  },
  chitchat: {
    toolName: '',
    keywords: [
      /^(你好|嗨|hello|hi|谢谢|感谢|再见|拜拜)/i,
      /^(怎么样|如何|什么)(?!(?:项目|团队|目标|任务|进度|状态|情况|数据))/,
    ],
    extractParams: () => ({}),
  },
};

// --- L0: Fast keyword-based intent detection (zero Token cost) ---

export function detectIntentFast(userMessage: string): ParsedIntent | null {
  for (const [intentType, reg] of Object.entries(INTENT_REGISTRY) as [string, IntentRegistration][]) {
    if (reg.keywords.some((kw) => kw.test(userMessage))) {
      const params = reg.extractParams(userMessage);
      const confidence = intentType === 'chitchat' ? 0.9 : 0.85;
      return {
        intent: intentType,
        confidence,
        toolName: reg.toolName,
        params,
        fallback: false,
        rawText: userMessage,
      };
    }
  }
  return null;  // No match → needs AI or fallback
}

// --- L1: AI-based intent parsing (1 Token cost, only for ambiguous inputs) ---

// Lazy import to avoid circular deps at module level
let _chatCompletion: typeof import('@/lib/aiService').chatCompletion | null = null;
let _buildModuleContext: typeof import('@/lib/moduleContext').buildModuleContext | null = null;

async function getAI() {
  if (!_chatCompletion) {
    const ai = await import('@/lib/aiService');
    _chatCompletion = ai.chatCompletion;
  }
  if (!_buildModuleContext) {
    const mc = await import('@/lib/moduleContext');
    _buildModuleContext = mc.buildModuleContext;
  }
  return { chatCompletion: _chatCompletion, buildModuleContext: _buildModuleContext };
}

export async function parseIntentAI(userMessage: string): Promise<ParsedIntent> {
  const { chatCompletion: cc, buildModuleContext: bmc } = await getAI();
  const moduleCtx = bmc!(useAppStore.getState().activeModule);

  const systemPrompt = `你是一个意图解析器。用户用自然语言描述需求，你需要提取结构化意图。

${moduleCtx}

输出JSON: { "intent": "create_task|update_task|query_progress|create_goal|chitchat", "confidence": 0-1, "toolName": "工具名", "params": {} }

意图→工具映射:
- create_task → "create_task", 参数: {title, priority?, due_date?}
- update_task → "update_task_status", 参数: {task_id?, status?}
- query_progress → "get_team_metrics"|"get_tasks"|"get_goals"
- create_goal → "update_goal_progress"
- chitchat → 无工具

规则: 只输出JSON; 无法确定→confidence<0.5; 日期用自然语言`;

  try {
    const response = await cc!([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ], { enableTools: false });

    const text = response.text.trim();
    let parsed: Record<string, unknown>;
    try {
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, text];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      try { parsed = JSON.parse(text); } catch {
        return { intent: 'unknown', confidence: 0, toolName: '', params: {}, fallback: true, rawText: userMessage };
      }
    }

    const intent = (parsed.intent as IntentType) ?? 'unknown';
    const confidence = Number(parsed.confidence) ?? 0;
    const reg = INTENT_REGISTRY[intent];
    const toolName = (parsed.toolName as string) ?? reg?.toolName ?? '';

    return {
      intent, confidence, toolName,
      params: (parsed.params as Record<string, unknown>) ?? {},
      fallback: confidence < 0.7 || intent === 'unknown',
      rawText: userMessage,
    };
  } catch (err) {
    console.error('[intentParser] parseIntentAI error:', err);
    return { intent: 'unknown', confidence: 0, toolName: '', params: {}, fallback: true, rawText: userMessage };
  }
}

// --- Execute parsed intent via aiTools ---

export async function executeIntent(parsed: ParsedIntent): Promise<IntentResult> {
  if (parsed.intent === 'chitchat' || !parsed.toolName) return { intent: parsed };
  if (parsed.fallback) return { intent: parsed };
  if (!isValidTool(parsed.toolName)) {
    return { intent: { ...parsed, fallback: true }, error: `工具 "${parsed.toolName}" 不存在` };
  }
  try {
    const toolResult = await executeToolCall(parsed.toolName, parsed.params);
    return { intent: parsed, toolResult };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { intent: { ...parsed, fallback: true }, error: msg };
  }
}

// --- Main entry: L0 fast → L1 AI → fallback ---
// Key optimization: avoids double AI call by using keyword fast-path first

export async function parseAndExecute(userMessage: string): Promise<IntentResult> {
  // L0: Try fast keyword detection first (zero Token cost)
  const fastResult = detectIntentFast(userMessage);
  if (fastResult) {
    return executeIntent(fastResult);
  }

  // L1: AI-based parsing for ambiguous inputs (1 AI call)
  const aiParsed = await parseIntentAI(userMessage);
  return executeIntent(aiParsed);
}

// --- Register new intent type (extensible) ---

export function registerIntent(type: IntentType, reg: IntentRegistration): void {
  INTENT_REGISTRY[type] = reg;
}

// --- Date resolution (natural language → YYYY-MM-DD) ---

import { useAppStore } from '@/stores/appStore';

export function resolveNaturalDate(dateStr: string): string | null {
  if (!dateStr || dateStr === '<需要查询>') return null;
  const now = new Date();
  const lower = dateStr.toLowerCase();
  if (/今天/.test(lower)) return formatDate(now);
  if (/明天/.test(lower)) return formatDate(new Date(now.getTime() + 86400000));
  if (/后天/.test(lower)) return formatDate(new Date(now.getTime() + 2 * 86400000));
  if (/下周一/.test(lower)) return getNextWeekday(now, 1);
  if (/下周二/.test(lower)) return getNextWeekday(now, 2);
  if (/下周三/.test(lower)) return getNextWeekday(now, 3);
  if (/下周四/.test(lower)) return getNextWeekday(now, 4);
  if (/下周五/.test(lower)) return getNextWeekday(now, 5);
  if (/本周[一二三四五]/.test(lower)) {
    const dayMap: Record<string, number> = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5 };
    const m = lower.match(/本周([一二三四五])/);
    if (m) return getThisWeekday(now, dayMap[m[1]] ?? 1);
  }
  if (/这周[一二三四五]/.test(lower)) {
    const dayMap: Record<string, number> = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5 };
    const m = lower.match(/这周([一二三四五])/);
    if (m) return getThisWeekday(now, dayMap[m[1]] ?? 1);
  }
  if (/下个月/.test(lower)) {
    const d = new Date(now);
    d.setMonth(d.getMonth() + 1);
    return formatDate(d);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  return null;
}

function formatDate(d: Date): string { return d.toISOString().slice(0, 10); }

function getNextWeekday(from: Date, targetDay: number): string {
  const d = new Date(from);
  const currentDay = d.getDay();
  let diff = targetDay - currentDay;
  if (diff <= 0) diff += 7;
  d.setDate(d.getDate() + diff + 7);  // next week
  return formatDate(d);
}

function getThisWeekday(from: Date, targetDay: number): string {
  const d = new Date(from);
  const currentDay = d.getDay();
  let diff = targetDay - currentDay;
  if (diff < 0) diff += 7;
  d.setDate(d.getDate() + diff);
  return formatDate(d);
}
