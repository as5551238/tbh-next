/**
 * Weekly Report Engine — Auto-generate structured weekly reports from team data.
 *
 * Flow:
 * 1. aggregateWeekData() — collect structured stats from tasks/goals/risks/actionItems
 * 2. generateWeeklyReport() — use chatCompletion() to produce natural language report
 * 3. Data → at least one automatic action (DR-53): generates report row in DB
 *
 * Design principles:
 * - DR-51: Auto-generation supports toggle, default low-disturbance
 * - DR-52: AI report has "手动编辑" fallback in UI
 * - DR-53: Data drives automatic report creation
 * - Pure aggregation function for testability; AI call is opt-in
 */

import { chatCompletion } from '@/lib/aiService';
import type { TaskRow, GoalRow, ActionItemRow, DeviationAlertRow } from '@/lib/dataLayer/types';

// ─── Lazy Supabase import (replaces CJS require) ───
let _supabase: any = null;
let _isSupabaseConfigured: (() => boolean) | null = null;
async function getSupabase() {
  if (!_supabase) {
    try {
      const mod = await import('@/lib/supabase');
      _supabase = mod.supabase;
      _isSupabaseConfigured = mod.isSupabaseConfigured;
    } catch { /* supabase not available */ }
  }
  return { supabase: _supabase, isSupabaseConfigured: _isSupabaseConfigured };
}

// ─── Types ───

export interface WeekDataAggregate {
  /** Period label, e.g. "2026-06-08 ~ 2026-06-14" */
  period: string;
  periodStart: string;
  periodEnd: string;
  // -- Tasks --
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  inProgressTasks: number;
  newTasksThisWeek: number;
  taskCompletionRate: number; // 0-100
  // -- Goals --
  totalGoals: number;
  completedGoals: number;
  atRiskGoals: number;
  avgGoalProgress: number; // 0-100
  // -- Risks & Alerts --
  newRisks: number;
  unresolvedAlerts: number;
  criticalAlerts: number;
  // -- Action Items --
  totalActionItems: number;
  completedActionItems: number;
  overdueActionItems: number;
  // -- Top overdue items --
  topOverdueTasks: Array<{ title: string; dueDate: string; daysLate: number }>;
  topAtRiskGoals: Array<{ title: string; progress: number; daysLeft: number }>;
}

export interface WeeklyReportResult {
  title: string;
  period: string;
  aiSummary: string;
  structuredData: WeekDataAggregate;
  generatedAt: string;
  model: string;
}

// ─── Helpers ───

function getWeekBounds(): { start: string; end: string; label: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(monday), end: fmt(sunday), label: `${fmt(monday)} ~ ${fmt(sunday)}` };
}

function isThisWeek(dateStr: string | null | undefined, weekStart: string, weekEnd: string): boolean {
  if (!dateStr) return false;
  return dateStr >= weekStart && dateStr <= weekEnd;
}

// ─── Aggregation (pure function) ───

export function aggregateWeekData(
  tasks: TaskRow[],
  goals: GoalRow[],
  actionItems: ActionItemRow[],
  alerts: DeviationAlertRow[],
): WeekDataAggregate {
  const { start, end, label } = getWeekBounds();
  const today = new Date().toISOString().slice(0, 10);

  // Tasks
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.done || t.status === 'done' || t.status === 'completed').length;
  const overdueTasks = tasks.filter((t) => {
    if (t.done || t.status === 'done' || t.status === 'completed') return false;
    return t.due_date && t.due_date < today;
  }).length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const newTasksThisWeek = tasks.filter((t) => {
    const created = (t as Record<string, unknown>).created_at as string | undefined;
    return created && isThisWeek(created, start, end);
  }).length;

  // Goals
  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.status === 'done' || g.progress >= 100).length;
  const atRiskGoals = goals.filter((g) => {
    if (g.status === 'done' || g.progress >= 100) return false;
    if (!g.end_date) return false;
    const daysLeft = Math.floor((new Date(g.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 7 && g.progress < 50;
  }).length;
  const avgGoalProgress = totalGoals > 0
    ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / totalGoals)
    : 0;

  // Risk & Alerts
  const newRisks = alerts.filter((a) => isThisWeek(a.created_at, start, end)).length;
  const unresolvedAlerts = alerts.filter((a) => !a.is_resolved).length;
  const criticalAlerts = alerts.filter((a) => !a.is_resolved && a.severity === 'critical').length;

  // Action Items
  const totalActionItems = actionItems.length;
  const completedActionItems = actionItems.filter((a) => a.status === 'completed').length;
  const overdueActionItems = actionItems.filter((a) => {
    if (a.status === 'completed' || a.status === 'cancelled') return false;
    return a.due_date && a.due_date < today;
  }).length;

  // Top overdue tasks (up to 5)
  const topOverdueTasks = tasks
    .filter((t) => {
      if (t.done || t.status === 'done' || t.status === 'completed') return false;
      return t.due_date && t.due_date < today;
    })
    .map((t) => ({
      title: t.title,
      dueDate: t.due_date!,
      daysLate: Math.floor((Date.now() - new Date(t.due_date!).getTime()) / (1000 * 60 * 60 * 24)),
    }))
    .sort((a, b) => b.daysLate - a.daysLate)
    .slice(0, 5);

  // Top at-risk goals (up to 5)
  const topAtRiskGoals = goals
    .filter((g) => {
      if (g.status === 'done' || g.progress >= 100 || !g.end_date) return false;
      const daysLeft = Math.floor((new Date(g.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return daysLeft <= 7 && g.progress < 50;
    })
    .map((g) => ({
      title: g.title,
      progress: Math.round(g.progress),
      daysLeft: Math.max(0, Math.floor((new Date(g.end_date!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5);

  return {
    period: label,
    periodStart: start,
    periodEnd: end,
    totalTasks,
    completedTasks,
    overdueTasks,
    inProgressTasks,
    newTasksThisWeek,
    taskCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    totalGoals,
    completedGoals,
    atRiskGoals,
    avgGoalProgress,
    newRisks,
    unresolvedAlerts,
    criticalAlerts,
    totalActionItems,
    completedActionItems,
    overdueActionItems,
    topOverdueTasks,
    topAtRiskGoals,
  };
}

// ─── AI Report Generation ───

const SYSTEM_PROMPT = `你是一位专业的团队管理分析师，擅长从数据中提炼洞察，生成高质量的周报。请根据提供的团队数据，生成结构化的中文周报，包含：
1. 本周概览（2-3句话总结整体情况）
2. 重点工作进展（按目标/项目分组，列出关键完成和进展）
3. 风险与预警（列出当前风险，给出建议）
4. 下周建议（基于数据给出2-3条可执行建议）

要求：
- 语言简洁专业，数据说话
- 突出关键风险和行动项
- 不要编造数据中没有的信息
- 控制在500字以内`;

export async function generateWeeklyReport(
  data: WeekDataAggregate,
): Promise<WeeklyReportResult> {
  const dataPrompt = `## 团队周数据 (${data.period})

### 任务概况
- 总任务: ${data.totalTasks}, 完成: ${data.completedTasks}, 逾期: ${data.overdueTasks}, 进行中: ${data.inProgressTasks}
- 完成率: ${data.taskCompletionRate}%
- 本周新建: ${data.newTasksThisWeek}

### 目标进展
- 总目标: ${data.totalGoals}, 已完成: ${data.completedGoals}, 高风险: ${data.atRiskGoals}
- 平均进度: ${data.avgGoalProgress}%

### 风险与预警
- 本周新增风险: ${data.newRisks}, 未解决: ${data.unresolvedAlerts}, 紧急: ${data.criticalAlerts}

### 行动项
- 总计: ${data.totalActionItems}, 完成: ${data.completedActionItems}, 逾期: ${data.overdueActionItems}

${data.topOverdueTasks.length > 0 ? `### 逾期任务 TOP5\n${data.topOverdueTasks.map((t, i) => `${i + 1}. ${t.title} — 逾期${t.daysLate}天(截止${t.dueDate})`).join('\n')}` : ''}

${data.topAtRiskGoals.length > 0 ? `### 高风险目标 TOP5\n${data.topAtRiskGoals.map((g, i) => `${i + 1}. ${g.title} — 进度${g.progress}%, 剩余${g.daysLeft}天`).join('\n')}` : ''}

请生成本周工作周报。`;

  let aiSummary: string;
  try {
    const res = await chatCompletion([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: dataPrompt },
    ]);
    aiSummary = res?.text ?? 'AI报告生成失败，请查看结构化数据。';
  } catch {
    aiSummary = 'AI报告暂不可用，请查看结构化数据或者稍后重试。';
  }

  return {
    title: `周报 ${data.period}`,
    period: data.period,
    aiSummary,
    structuredData: data,
    generatedAt: new Date().toISOString(),
    model: 'deepseek',
  };
}

// ─── Markdown Export ───

export function reportToMarkdown(report: WeeklyReportResult): string {
  const d = report.structuredData;
  const lines = [
    `# ${report.title}`,
    '',
    `> 生成时间: ${new Date(report.generatedAt).toLocaleString('zh-CN')}`,
    '',
    '---',
    '',
    report.aiSummary,
    '',
    '---',
    '',
    '## 结构化数据',
    '',
    '### 任务',
    `- 总计: ${d.totalTasks} | 完成: ${d.completedTasks} | 逾期: ${d.overdueTasks} | 进行中: ${d.inProgressTasks}`,
    `- 完成率: ${d.taskCompletionRate}%`,
    `- 本周新建: ${d.newTasksThisWeek}`,
    '',
    '### 目标',
    `- 总计: ${d.totalGoals} | 已完成: ${d.completedGoals} | 高风险: ${d.atRiskGoals}`,
    `- 平均进度: ${d.avgGoalProgress}%`,
    '',
    '### 风险',
    `- 新增: ${d.newRisks} | 未解决: ${d.unresolvedAlerts} | 紧急: ${d.criticalAlerts}`,
    '',
    '### 行动项',
    `- 总计: ${d.totalActionItems} | 完成: ${d.completedActionItems} | 逾期: ${d.overdueActionItems}`,
    '',
  ];

  if (d.topOverdueTasks.length > 0) {
    lines.push('### 逾期任务 TOP5');
    d.topOverdueTasks.forEach((t, i) => lines.push(`${i + 1}. ${t.title} — 逾期${t.daysLate}天(截止${t.dueDate})`));
    lines.push('');
  }

  if (d.topAtRiskGoals.length > 0) {
    lines.push('### 高风险目标 TOP5');
    d.topAtRiskGoals.forEach((g, i) => lines.push(`${i + 1}. ${g.title} — 进度${g.progress}%, 剩余${g.daysLeft}天`));
    lines.push('');
  }

  return lines.join('\n');
}

// ─── Persistence (localStorage primary + Supabase dual-write) ───

const REPORTS_STORAGE_KEY = 'tbh-saved-reports';

export interface SavedReport {
  id: string;
  type: 'weekly' | 'monthly' | 'custom';
  title: string;
  period: string;
  aiSummary: string;
  structuredData: WeekDataAggregate;
  generatedAt: string;
  model: string;
}

export function saveReportLocally(report: WeeklyReportResult): SavedReport {
  const saved: SavedReport = {
    id: `report_${Date.now()}`,
    type: 'weekly',
    title: report.title,
    period: report.period,
    aiSummary: report.aiSummary,
    structuredData: report.structuredData,
    generatedAt: report.generatedAt,
    model: report.model,
  };
  try {
    const existing: SavedReport[] = JSON.parse(localStorage.getItem(REPORTS_STORAGE_KEY) ?? '[]');
    existing.unshift(saved);
    // Keep only last 20 reports locally
    const trimmed = existing.slice(0, 20);
    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(trimmed));
  } catch { /* silently ignore */ }

  // Async Supabase dual-write (fire-and-forget)
  getSupabase().then(({ supabase, isSupabaseConfigured }) => {
    if (isSupabaseConfigured?.() && supabase) {
      supabase.from('reports').insert({
        team_id: '__default__',
        type: saved.type,
        title: saved.title,
        period: saved.period,
        period_start: saved.structuredData.periodStart,
        period_end: saved.structuredData.periodEnd,
        ai_summary: saved.aiSummary,
        structured_data: saved.structuredData,
        model: saved.model,
      }).then(() => { /* fire-and-forget */ })
        .catch(() => { /* silently fail */ });
    }
  }).catch(() => { /* supabase not available */ });

  return saved;
}

export function loadSavedReports(): SavedReport[] {
  try {
    const raw = localStorage.getItem(REPORTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function loadReportsFromDB(limit = 20): Promise<SavedReport[]> {
  try {
    const { supabase, isSupabaseConfigured } = await getSupabase();
    if (isSupabaseConfigured?.() && supabase) {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (!error && data && data.length > 0) {
        const dbReports: SavedReport[] = data.map((row: Record<string, unknown>) => ({
          id: row.id as string,
          type: (row.type as string) || 'weekly',
          title: row.title as string,
          period: row.period as string,
          aiSummary: (row.ai_summary as string) ?? '',
          structuredData: (row.structured_data as WeekDataAggregate) ?? {},
          generatedAt: (row.created_at as string) ?? '',
          model: (row.model as string) ?? 'deepseek',
        }));
        // Conflict resolution: merge DB + localStorage, dedupe by period, keep newest
        return mergeReports(dbReports, loadSavedReports(), limit);
      }
    }
  } catch { /* fallback to local */ }
  return loadSavedReports();
}

/**
 * Merge DB and local reports: dedupe by period, keep the one with latest generatedAt.
 * DB reports take precedence when timestamps are equal.
 */
function mergeReports(dbReports: SavedReport[], localReports: SavedReport[], limit: number): SavedReport[] {
  const byPeriod = new Map<string, SavedReport>();
  // Insert local first
  for (const r of localReports) {
    const key = r.period;
    const existing = byPeriod.get(key);
    if (!existing || r.generatedAt > existing.generatedAt) {
      byPeriod.set(key, r);
    }
  }
  // DB overrides if newer
  for (const r of dbReports) {
    const key = r.period;
    const existing = byPeriod.get(key);
    if (!existing || r.generatedAt >= existing.generatedAt) {
      byPeriod.set(key, r);
    }
  }
  return Array.from(byPeriod.values())
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))
    .slice(0, limit);
}
