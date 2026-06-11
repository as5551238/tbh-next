/**
 * Intent Parser — Natural Language → Structured Intent → Tool Execution.
 *
 * Paradigm shift: "对话即操作" (Conversation-as-Action).
 * User speaks naturally → we extract intent → execute via aiTools → refresh UI.
 *
 * Architecture (v3 — Multi-turn context):
 * - L0 快速路径: 本地关键词匹配, 零 Token 消耗
 * - L1 AI 路径: 仅在 L0 无法确定时调用, 1 次 AI 调用, 支持多轮上下文
 * - L2 兜底路径: AI 置信度低 → 显示表单, 0 Token 额外消耗
 *
 * Multi-turn: parseAndExecute accepts recent chat history for context resolution.
 *   - Anaphora resolution: "把它改成高优先级" → resolves "它" from recent task/goal context
 *   - Follow-up: "再加一个截止日期" → adds due_date to last-created task
 *   - Correction: "不对，改为明天" → updates the last operation's params
 *
 * Fallback: When parsing fails, returns a fallback flag so UI can show a form.
 */

import { executeToolCall, isValidTool } from '@/lib/aiTools';

// --- Types ---

export type IntentType = 'create_task' | 'update_task' | 'query_progress' | 'create_goal' | 'create_action_item' | 'query_risks' | 'query_schedule' | 'chitchat' | 'unknown';

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

// --- Multi-turn context types ---

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  toolName?: string;   // if this was a tool execution, what tool
  intentType?: string; // if this was an intent parse, what intent
}

// Track recent intent context for anaphora resolution
let recentIntentContext: {
  lastIntentType: IntentType;
  lastToolName: string;
  lastParams: Record<string, unknown>;
  lastToolResult?: unknown;
  timestamp: number;
} | null = null;

/** Update recent context after a successful intent execution */
export function updateIntentContext(intent: ParsedIntent, toolResult?: unknown): void {
  if (intent.intent === 'chitchat' || intent.intent === 'unknown') return;
  recentIntentContext = {
    lastIntentType: intent.intent,
    lastToolName: intent.toolName,
    lastParams: intent.params,
    lastToolResult: toolResult,
    timestamp: Date.now(),
  };
}

/** Get recent context for multi-turn resolution (max 5 min TTL) */
export function getRecentContext(): typeof recentIntentContext {
  if (recentIntentContext && Date.now() - recentIntentContext.timestamp < 5 * 60 * 1000) {
    return recentIntentContext;
  }
  recentIntentContext = null;
  return null;
}

// --- Registry-based Intent → Tool mapping ---

interface IntentRegistration {
  toolName: string;
  keywords: RegExp[];
  extractParams: (text: string) => Record<string, unknown>;
}

function isValidIntent(t: IntentType): t is Exclude<IntentType, 'unknown'> {
  return t !== 'unknown';
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
    toolName: 'create_goal',
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
  // --- Multi-turn follow-up patterns ---
  create_action_item: {
    toolName: 'create_action_item',
    keywords: [
      /(?:创建|新建|添加).*(?:行动项|纠正措施|改进项|action\s*item)/,
      /(?:加一个|补充).*(?:行动项|纠正)/,
    ],
    extractParams: (text) => {
      const params: Record<string, unknown> = {};
      let title = text
        .replace(/^(帮我|请)?(创建|新建|添加|加一个|补充)\s*/g, '')
        .replace(/(行动项|纠正措施|改进项|action\s*item)\s*$/i, '')
        .replace(/[，。！？,.!]*$/, '')
        .trim();
      if (title) params.title = title;
      if (/紧急|urgent/i.test(text)) params.priority = 'urgent';
      else if (/高优先|重要|high/i.test(text)) params.priority = 'high';
      else params.priority = 'medium';
      return params;
    },
  },
  query_risks: {
    toolName: 'get_deviation_alerts',
    keywords: [
      /(?:查询|查看|看看).*(?:风险|偏差|预警|告警|超期)/,
      /(?:有什么).*(?:风险|问题|阻塞|超期|overdue)/,
      /(?:风险|偏差).*(?:报告|概览|列表)/,
    ],
    extractParams: () => ({}),
  },
  query_schedule: {
    toolName: 'get_schedule_events',
    keywords: [
      /(?:查询|查看|看看|今天).*(?:日程|安排|日历|会议|schedule)/,
      /(?:今天|明天|本周).*(?:有什么|安排|日程)/,
    ],
    extractParams: () => ({}),
  },
};

// --- Multi-turn: Anaphora & follow-up resolution ---

// Patterns that suggest follow-up to a previous action
const FOLLOWUP_PATTERNS: RegExp[] = [
  /(?:把|将)?(?:它|这个|那个|上面|刚才).*(?:改|改|更新|设置为?)/,
  /(?:加上|补充|追加|额外).*(?:截止|日期|标签|备注|描述)/,
  /(?:不对|不是|算了|撤销|取消刚才)/,
  /(?:优先级)?改为?(?:紧急|高|中|低)/,
  /(?:截止|日期).*(?:改|设|调整|推迟|提前)/,
  /^再?(?:加|建|创)一个/,
  /(?:还有|另外|然后)(?:呢)?$/,
];

/** Check if message is a follow-up to recent context */
export function detectFollowUp(userMessage: string): ParsedIntent | null {
  const ctx = getRecentContext();
  if (!ctx) return null;

  const isFollowUp = FOLLOWUP_PATTERNS.some((p) => p.test(userMessage));
  if (!isFollowUp) return null;

  // Resolve what the user is referring to
  const params: Record<string, unknown> = { ...ctx.lastParams };

  // Cancel/correction
  if (/不对|不是|算了|撤销|取消刚才/.test(userMessage)) {
    return {
      intent: 'chitchat',
      confidence: 0.8,
      toolName: '',
      params: { _cancelled: true },
      fallback: false,
      rawText: userMessage,
    };
  }

  // Priority change
  const prioMatch = userMessage.match(/改为?(紧急|高|中|低)/);
  if (prioMatch) {
    const prioMap: Record<string, string> = { '紧急': 'urgent', '高': 'high', '中': 'medium', '低': 'low' };
    params.priority = prioMap[prioMatch[1]] ?? 'medium';
    return {
      intent: 'update_task',
      confidence: 0.75,
      toolName: 'update_task_status',
      params,
      fallback: false,
      rawText: userMessage,
    };
  }

  // Due date change
  const dateMatch = userMessage.match(/(?:截止|日期).*(?:改|设|调整|推迟|提前).*(今天|明天|后天|下周一|下周二|下周三|下周四|下周五|本周[一二三四五]|这周[一二三四五]|\d{4}-\d{2}-\d{2})/);
  if (dateMatch) {
    const resolved = resolveNaturalDate(dateMatch[1]);
    if (resolved) params.due_date = resolved;
    return {
      intent: 'update_task',
      confidence: 0.75,
      toolName: 'update_task_status',
      params,
      fallback: false,
      rawText: userMessage,
    };
  }

  // Generic follow-up — update the same entity with new info
  if (/加上|补充|追加|额外/.test(userMessage)) {
    let extra = userMessage.replace(/^(加上|补充|追加|额外)\s*/g, '').trim();
    // Try to extract specific field
    if (/截止|日期/.test(extra)) {
      const dm = extra.match(/(今天|明天|后天|下周一|下周二|下周三|下周四|下周五|本周[一二三四五]|\d{4}-\d{2}-\d{2})/);
      if (dm) params.due_date = resolveNaturalDate(dm[1]);
    }
    if (/备注|描述|说明/.test(extra)) {
      params.description = extra.replace(/(截止|日期|备注|描述|说明).*?(今天|明天|后天|下周一|下周二|下周三|下周四|下周五|本周[一二三四五]|\d{4}-\d{2}-\d{2})?\s*/g, '').trim() || extra;
    }
    return {
      intent: ctx.lastIntentType,
      confidence: 0.7,
      toolName: ctx.lastToolName,
      params,
      fallback: false,
      rawText: userMessage,
    };
  }

  return null;
}

// --- L0: Fast keyword-based intent detection (zero Token cost) ---

export function detectIntentFast(userMessage: string): ParsedIntent | null {
  // L0a: Check for multi-turn follow-up first
  const followUp = detectFollowUp(userMessage);
  if (followUp) return followUp;

  // L0b: Keyword matching
  for (const [intentType, reg] of Object.entries(INTENT_REGISTRY) as [Exclude<IntentType, 'unknown'>, IntentRegistration][]) {
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

export async function parseIntentAI(userMessage: string, chatHistory?: ConversationTurn[]): Promise<ParsedIntent> {
  const { chatCompletion: cc, buildModuleContext: bmc } = await getAI();
  const moduleCtx = bmc!(useAppStore.getState().activeModule);

  // Build multi-turn context summary from recent history (last 6 turns)
  let contextBlock = '';
  if (chatHistory && chatHistory.length > 0) {
    const recent = chatHistory.slice(-6);
    const ctx = getRecentContext();
    contextBlock = `\n\n近期对话上下文:\n${recent.map((t) => `  [${t.role}] ${t.content.slice(0, 100)}`).join('\n')}`;
    if (ctx) {
      contextBlock += `\n\n上次操作: intent=${ctx.lastIntentType}, tool=${ctx.lastToolName}, params=${JSON.stringify(ctx.lastParams)}`;
    }
    contextBlock += `\n\n注意: 如果用户用了代词("它""这个""那个""刚才")或省略了主语，请参考上下文推断指代对象。`;
  }

  const systemPrompt = `你是一个意图解析器。用户用自然语言描述需求，你需要提取结构化意图。

${moduleCtx}
${contextBlock}

输出JSON: { "intent": "create_task|update_task|query_progress|create_goal|create_action_item|query_risks|query_schedule|chitchat", "confidence": 0-1, "toolName": "工具名", "params": {} }

意图→工具映射:
- create_task → "create_task", 参数: {title, priority?, due_date?}
- update_task → "update_task_status", 参数: {task_id?, status?, priority?, due_date?}
- query_progress → "get_team_metrics"|"get_tasks"|"get_goals"
- create_goal → "create_goal", 参数: {title, end_date?, description?}
- create_action_item → "create_action_item", 参数: {title, priority?}
- query_risks → "get_deviation_alerts"
- query_schedule → "get_schedule_events"
- chitchat → 无工具

规则: 只输出JSON; 无法确定→confidence<0.5; 日期用自然语言; 支持代词解析(用"它"指代上文的任务/目标)`;

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
    const reg = isValidIntent(intent) ? INTENT_REGISTRY[intent] : undefined;
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
// v3: Accepts chatHistory for multi-turn context resolution

export async function parseAndExecute(userMessage: string, chatHistory?: ConversationTurn[]): Promise<IntentResult> {
  // L0: Try fast keyword detection first (zero Token cost)
  const fastResult = detectIntentFast(userMessage);
  if (fastResult) {
    const result = await executeIntent(fastResult);
    // Update context on successful execution
    if (!result.intent.fallback && result.toolResult !== undefined) {
      updateIntentContext(fastResult, result.toolResult);
    }
    return result;
  }

  // L1: AI-based parsing for ambiguous inputs (1 AI call), with multi-turn context
  const aiParsed = await parseIntentAI(userMessage, chatHistory);
  const result = await executeIntent(aiParsed);
  // Update context on successful execution
  if (!result.intent.fallback && result.toolResult !== undefined) {
    updateIntentContext(aiParsed, result.toolResult);
  }
  return result;
}

// --- Register new intent type (extensible) ---

export function registerIntent(type: Exclude<IntentType, 'unknown'>, reg: IntentRegistration): void {
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
