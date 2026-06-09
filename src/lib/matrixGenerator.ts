/**
 * Matrix Generator — AI-powered dynamic MatrixCell creation.
 *
 * When a user's industry+dept combo doesn't exist in the base MATRIX,
 * this module generates contextual KPIs, workflow, agents, etc. on-the-fly.
 *
 * Strategy:
 * 1. If AI (Edge Function) is available, use LLM to generate domain-specific data
 * 2. Otherwise, use a template-based local fallback
 */

import type { MatrixCell, KPI, Agent } from '@/matrix/data';
import { chatCompletion, type ChatMessage } from '@/lib/aiService';

// --- Custom Cell Registry (persisted in localStorage) ---

const CUSTOM_CELLS_KEY = 'tbh_custom_matrix_cells';
const CUSTOM_INDUSTRIES_KEY = 'tbh_custom_industries';

interface CustomCellEntry {
  industry: string;
  dept: string;
  cell: MatrixCell;
  color: string;
  createdAt: string;
}

export function getCustomCells(): CustomCellEntry[] {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_CELLS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function getCustomIndustries(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_INDUSTRIES_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveCustomCell(entry: CustomCellEntry): void {
  const cells = getCustomCells();
  // Replace if exists, else append
  const idx = cells.findIndex((c) => c.industry === entry.industry && c.dept === entry.dept);
  if (idx >= 0) {
    cells[idx] = entry;
  } else {
    cells.push(entry);
  }
  localStorage.setItem(CUSTOM_CELLS_KEY, JSON.stringify(cells));

  // Track the custom industry
  const industries = getCustomIndustries();
  if (!industries.includes(entry.industry)) {
    industries.push(entry.industry);
    localStorage.setItem(CUSTOM_INDUSTRIES_KEY, JSON.stringify(industries));
  }
}

export function findCustomCell(industry: string, dept: string): MatrixCell | null {
  const cells = getCustomCells();
  const found = cells.find((c) => c.industry === industry && c.dept === dept);
  return found?.cell ?? null;
}

export function getCustomIndustryColor(industry: string): string | null {
  const cells = getCustomCells();
  const found = cells.find((c) => c.industry === industry);
  return found?.color ?? null;
}

// --- AI Generation ---

export async function generateMatrixCellAI(industry: string, dept: string): Promise<MatrixCell> {
  const systemPrompt = [
    `你是一个行业专家，需要为「${industry} · ${dept}」生成业务矩阵数据。`,
    '',
    '## 输出格式（严格JSON）',
    '```json',
    '{',
    '  "kpis": [4-5个KPI, 每个包含 name/value/target/status(枚举good/warn/bad)/trend(枚举up/down/flat)]，',
    '  "workflow": [5-6个流程步骤],',
    '  "wfCurrent": 当前步骤索引(0-based),',
    '  "top3": [3条预警, 每条包含 text/level(枚举danger/warn/info)],',
    '  "morning": 1句晨间播报(50字内),',
    '  "agents": [3个AI Agent, 每个包含 name/desc/status(在线/分析中/待命)],',
    '  "channels": [4个频道名],',
    '  "ribbon": 1句业务概览(30字内),',
    '  "nextStep": 下一步建议(4字内)',
    '}',
    '```',
    '',
    '## 要求',
    `1. KPI必须反映「${industry}·${dept}」的核心业务指标`,
    '2. 工作流是该部门典型业务推进步骤',
    '3. 预警内容贴近真实业务场景',
    '4. Agent功能与该部门工作强相关',
    '5. 只返回JSON，不要任何其他文字',
  ].join('\n');

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `请为「${industry}」行业的「${dept}」生成完整的业务矩阵数据。` },
  ];

  try {
    const res = await chatCompletion(messages);
    const cleanText = res.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanText);
    return validateAndFill(parsed, industry, dept);
  } catch {
    return generateLocalFallback(industry, dept);
  }
}

// --- Local Template Fallback ---

const INDUSTRY_TEMPLATES: Record<string, { kpiNames: string[][]; workflowTemplates: string[][] }> = {
  'default': {
    kpiNames: [
      ['完成率', '85%', '≥90%', 'warn', 'up'],
      ['效率指数', '3.5', '≥4.0', 'warn', 'flat'],
      ['客户满意度', '88%', '≥85%', 'good', 'up'],
      ['成本偏差', '5%', '≤8%', 'good', 'flat'],
    ],
    workflowTemplates: [
      ['规划', '执行', '检查', '反馈', '优化'],
    ],
  },
};

function generateLocalFallback(industry: string, dept: string): MatrixCell {
  const template = INDUSTRY_TEMPLATES['default'];
  const kpis: KPI[] = template.kpiNames.map(([name, value, target, status, trend]) => ({
    name: `${dept}${name}`,
    value,
    target,
    status: status as KPI['status'],
    trend: trend as KPI['trend'],
  }));

  const workflow = template.workflowTemplates[0];
  const agents: Agent[] = [
    { name: `${dept}专家`, desc: `${industry}业务分析`, status: '在线' },
    { name: '效率助手', desc: '流程优化建议', status: '待命' },
    { name: '风险哨兵', desc: '风险预警监控', status: '分析中' },
  ];

  return {
    kpis,
    workflow,
    wfCurrent: 1,
    top3: [
      { text: `${dept}核心指标未达标，需关注`, level: 'warn' as const },
      { text: `${industry}政策变化可能影响业务`, level: 'info' as const },
      { text: '资源分配需优化', level: 'info' as const },
    ],
    morning: `今日关注：${dept}效率指标和${industry}行业动态。`,
    agents,
    channels: [`${dept}-工作群`, `${dept}-数据看板`, `${industry}-行业动态`, `${dept}-协作空间`],
    ribbon: `${dept}完成率85% ⚠ · 满意度88% ✓`,
    nextStep: '执行',
  };
}

// --- Validation ---

function validateAndFill(raw: Record<string, unknown>, industry: string, dept: string): MatrixCell {
  const validStatuses = ['good', 'warn', 'bad'] as const;
  const validTrends = ['up', 'down', 'flat'] as const;
  const validLevels = ['danger', 'warn', 'info'] as const;

  const kpis: KPI[] = (Array.isArray(raw.kpis) ? raw.kpis : []).slice(0, 5).map((k: Record<string, unknown>) => ({
    name: String(k.name || '指标'),
    value: String(k.value || '-'),
    target: String(k.target || '-'),
    status: validStatuses.includes(k.status as KPI['status']) ? (k.status as KPI['status']) : 'warn',
    trend: validTrends.includes(k.trend as KPI['trend']) ? (k.trend as KPI['trend']) : 'flat',
  }));

  if (kpis.length === 0) kpis.push(...generateLocalFallback(industry, dept).kpis);

  const workflow = Array.isArray(raw.workflow) ? raw.workflow.map(String) : generateLocalFallback(industry, dept).workflow;

  const top3 = (Array.isArray(raw.top3) ? raw.top3 : []).slice(0, 3).map((t: Record<string, unknown>) => ({
    text: String(t.text || '请注意业务动态'),
    level: validLevels.includes(t.level as 'danger' | 'warn' | 'info') ? (t.level as 'danger' | 'warn' | 'info') : 'info' as const,
  }));

  const agents: Agent[] = (Array.isArray(raw.agents) ? raw.agents : []).slice(0, 3).map((a: Record<string, unknown>) => ({
    name: String(a.name || '助手'),
    desc: String(a.desc || '业务助手'),
    status: String(a.status || '在线'),
  }));

  return {
    kpis,
    workflow,
    wfCurrent: typeof raw.wfCurrent === 'number' ? Math.min(raw.wfCurrent, workflow.length - 1) : 1,
    top3: top3.length > 0 ? top3 : generateLocalFallback(industry, dept).top3,
    morning: String(raw.morning || `${dept}今日聚焦：关键指标跟踪。`),
    agents: agents.length > 0 ? agents : generateLocalFallback(industry, dept).agents,
    channels: Array.isArray(raw.channels) ? raw.channels.map(String).slice(0, 4) : generateLocalFallback(industry, dept).channels,
    ribbon: String(raw.ribbon || `${dept}运行中`),
    nextStep: String(raw.nextStep || '执行'),
  };
}

// --- Default color for custom industries ---

const CUSTOM_COLORS = [
  '#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff',
  '#5f27cd', '#01a3a4', '#f368e0', '#10ac84', '#ee5a24',
];

export function getColorForIndustry(industry: string, existingColors: Record<string, string>): string {
  if (existingColors[industry]) return existingColors[industry];
  // Deterministic color based on industry name
  let hash = 0;
  for (let i = 0; i < industry.length; i++) {
    hash = ((hash << 5) - hash + industry.charCodeAt(i)) | 0;
  }
  return CUSTOM_COLORS[Math.abs(hash) % CUSTOM_COLORS.length];
}
