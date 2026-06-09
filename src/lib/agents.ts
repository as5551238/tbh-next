/**
 * Agent definitions for TBH AI Colleague system.
 *
 * Each agent has:
 * - id: unique identifier
 * - name: display name
 * - icon: emoji icon
 * - description: short description
 * - systemPrompt: system prompt for LLM context
 * - capabilities: what this agent can do
 * - route: keyword patterns that trigger this agent
 */

import type { MatrixCell } from '@/matrix/data';
import { buildSystemPrompt } from '@/lib/aiService';
import { DEFAULT_CONSTRAINTS, type AgentConstraints } from '@/lib/agentHarness';

export interface AgentDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  systemPrompt: (cell: MatrixCell, industry: string, dept: string) => string;
  capabilities: string[];
  route: RegExp;
  color: string; // accent color for UI
  constraints?: AgentConstraints; // Harness behavior constraints (falls back to DEFAULT_CONSTRAINTS[id])
}

// --- Agent 1: Morning Brief Agent ---

export const MORNING_AGENT: AgentDef = {
  id: 'morning-brief',
  name: '晨报助手',
  icon: '☀️',
  description: '每日晨间播报、待办聚焦、风险速览',
  color: '#f59e0b',
  capabilities: [
    '晨间摘要生成',
    '今日待办优先级排序',
    '风险速览与行动建议',
    '关键指标变化提醒',
  ],
  route: /晨报|早报|晨间|今日聚焦|morning|今天重点|今日待办/i,
  systemPrompt: (cell, industry, dept) => [
    buildSystemPrompt(cell, industry, dept),
    '',
    '## 你是「晨报助手」',
    '你专注于为用户生成每日晨间播报。基于最新的KPI、风险和工作流数据，给出简洁有力的晨间摘要。',
    '',
    '### 输出格式',
    '1. 用1-2句概括今日核心状态',
    '2. 列出3-5项今日重点（按优先级）',
    '3. 对每项告警/危险KPI给出具体行动建议',
    '4. 语气专业但不冷漠，像一位资深同事在提醒你',
  ].join('\n'),
};

// --- Agent 2: Progress Tracking Agent ---

export const PROGRESS_AGENT: AgentDef = {
  id: 'progress-tracker',
  name: '进度追踪',
  icon: '📊',
  description: 'KPI分析、目标进度、趋势预测',
  color: 'var(--brand-accent)',
  capabilities: [
    'KPI达标率分析',
    '目标进度追踪',
    '趋势变化预警',
    '效率瓶颈定位',
  ],
  route: /KPI|指标|进度|绩效|目标|达成率|里程碑|完成率/i,
  systemPrompt: (cell, industry, dept) => [
    buildSystemPrompt(cell, industry, dept),
    '',
    '## 你是「进度追踪」助手',
    '你专注于数据驱动的进度分析。基于KPI和目标数据，给出精准的达标率分析和趋势预测。',
    '',
    '### 输出格式',
    '1. 整体达标率概览',
    '2. 逐项KPI分析（当前值/目标/差距/趋势）',
    '3. 预测：按当前速率，能否按时达标',
    '4. 瓶颈识别与优化建议',
    '5. 使用表格展示数据，增强可读性',
  ].join('\n'),
};

// --- Agent 3: Risk Monitor Agent ---

export const RISK_AGENT: AgentDef = {
  id: 'risk-monitor',
  name: '风险监控',
  icon: '🛡️',
  description: '风险识别、预警推送、应对方案',
  color: 'var(--status-danger-bright)',
  capabilities: [
    '风险等级评估',
    '预警推送与升级',
    '应对方案推荐',
    '历史风险模式分析',
  ],
  route: /风险|预警|告警|隐患|问题|异常|堵塞|延迟|超时/i,
  systemPrompt: (cell, industry, dept) => [
    buildSystemPrompt(cell, industry, dept),
    '',
    '## 你是「风险监控」助手',
    '你专注于风险识别、评估和应对。基于当前风险数据和业务指标，给出有针对性的风险分析和应对建议。',
    '',
    '### 输出格式',
    '1. 风险总览（高/中/低等级计数）',
    '2. 逐项风险评估（等级+影响范围+紧急度）',
    '3. 推荐应对方案（具体可执行）',
    '4. 需要升级的事项（标明升级对象和时间节点）',
    '5. 风险趋势判断（恶化/稳定/改善）',
  ].join('\n'),
};

// --- Agent Registry ---

export const ALL_AGENTS: AgentDef[] = [MORNING_AGENT, PROGRESS_AGENT, RISK_AGENT];

/**
 * Route a user message to the best-matching agent.
 * Returns the agent definition or null if no match (use general assistant).
 */
export function routeToAgent(input: string): AgentDef | null {
  for (const agent of ALL_AGENTS) {
    if (agent.route.test(input)) return agent;
  }
  return null;
}

/**
 * Get agent by ID.
 */
export function getAgentById(id: string): AgentDef | undefined {
  return ALL_AGENTS.find((a) => a.id === id);
}
