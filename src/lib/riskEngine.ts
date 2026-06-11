/**
 * Risk Warning Engine — Proactive risk detection & alert generation.
 *
 * Scans tasks, goals, action_items and deviation_alerts for risk signals,
 * produces scored RiskAlert objects, and optionally persists them via
 * createDeviationAlert / createRisk.
 *
 * Design principles:
 * - DR-51: Auto-detection supports toggle (autoScan param), default low-disturbance
 * - DR-52: Every AI-driven alert links back to source data (task_id / goal_id)
 * - DR-53: Data drives at least one automatic action (alert → deviation_alerts row)
 * - Pure functions for testability; DB writes are opt-in at the call-site
 */

import type { TaskRow, GoalRow, ActionItemRow, DeviationAlertRow } from '@/lib/dataLayer/types';

// ─── Types ───

export type RiskSeverity = 'critical' | 'warning' | 'info';

export interface RiskAlert {
  id: string;                // deterministic hash for dedup
  source: 'task_overdue' | 'task_stalled' | 'goal_at_risk' | 'goal_overdue' | 'action_item_overdue' | 'milestone_overdue';
  severity: RiskSeverity;
  title: string;
  description: string;
  score: number;             // 0-100, higher = more urgent
  taskId?: string;
  goalId?: string;
  actionItemId?: string;
  detectedAt: string;        // ISO
}

export interface RiskScanResult {
  alerts: RiskAlert[];
  summary: { critical: number; warning: number; info: number; total: number };
  scannedAt: string;
}

// ─── Config (DR-51: toggle via autoScan) ───

export interface RiskEngineConfig {
  /** Enable proactive scanning. Set false for manual-only mode. */
  autoScan: boolean;
  /** Days after due_date before flagging task_overdue as critical. Default 3. */
  overdueCriticalDays: number;
  /** Days after due_date before flagging task_overdue as warning. Default 1. */
  overdueWarningDays: number;
  /** Days without status update before flagging task_stalled. Default 7. */
  stalledDays: number;
  /** Goal progress below this % with <=7 days to end_date → goal_at_risk. Default 30. */
  goalAtRiskProgress: number;
  /** Days before goal end_date to start warning. Default 7. */
  goalAtRiskDaysBeforeEnd: number;
}

const DEFAULT_CONFIG: RiskEngineConfig = {
  autoScan: true,
  overdueCriticalDays: 3,
  overdueWarningDays: 1,
  stalledDays: 7,
  goalAtRiskProgress: 30,
  goalAtRiskDaysBeforeEnd: 7,
};

// ─── Helpers ───

function daysBetween(a: string, b: Date): number {
  const da = new Date(a);
  return Math.floor((b.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}

function deterministicId(source: string, entityId: string, date: string): string {
  // Simple hash for dedup — same source+entity+date = same ID
  let h = 0;
  const str = `risk:${source}:${entityId}:${date.slice(0, 10)}`;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return `ra_${Math.abs(h).toString(36)}`;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Detection Rules ───

function detectOverdueTasks(tasks: TaskRow[], cfg: RiskEngineConfig, now: Date): RiskAlert[] {
  const today = now.toISOString().slice(0, 10);
  return tasks
    .filter((t) => {
      if (t.done || t.status === 'done' || t.status === 'completed') return false;
      if (!t.due_date) return false;
      return t.due_date < today;
    })
    .map((t) => {
      const daysLate = daysBetween(t.due_date!, now);
      let severity: RiskSeverity = 'info';
      let score = 30;
      if (daysLate >= cfg.overdueCriticalDays) {
        severity = 'critical';
        score = 80 + Math.min(daysLate, 20);
      } else if (daysLate >= cfg.overdueWarningDays) {
        severity = 'warning';
        score = 50 + daysLate * 10;
      }
      return {
        id: deterministicId('task_overdue', t.id, today),
        source: 'task_overdue' as const,
        severity,
        title: `任务逾期: ${t.title}`,
        description: `任务「${t.title}」已逾期 ${daysLate} 天（截止: ${t.due_date}），当前状态: ${t.status}`,
        score: Math.min(score, 100),
        taskId: t.id,
        detectedAt: now.toISOString(),
      };
    });
}

function detectStalledTasks(tasks: TaskRow[], cfg: RiskEngineConfig, now: Date): RiskAlert[] {
  const today = now.toISOString().slice(0, 10);
  return tasks
    .filter((t) => {
      if (t.done || t.status === 'done' || t.status === 'completed') return false;
      if (t.status !== 'in_progress') return false;
      // Stalled = in_progress but no status change for stalledDays
      // Use updated_at from task if available, otherwise created_at
      const lastUpdate = (t as unknown as Record<string, unknown>).updated_at as string | undefined
        ?? (t as unknown as Record<string, unknown>).created_at as string | undefined;
      if (!lastUpdate) return false;
      return daysBetween(lastUpdate, now) >= cfg.stalledDays;
    })
    .map((t) => {
      const lastUpdate = (t as unknown as Record<string, unknown>).updated_at as string | undefined
        ?? (t as unknown as Record<string, unknown>).created_at as string | undefined ?? '';
      const daysStalled = daysBetween(lastUpdate, now);
      return {
        id: deterministicId('task_stalled', t.id, today),
        source: 'task_stalled' as const,
        severity: 'warning' as RiskSeverity,
        title: `任务停滞: ${t.title}`,
        description: `任务「${t.title}」已 ${daysStalled} 天无状态更新，可能需要关注`,
        score: Math.min(40 + daysStalled * 3, 70),
        taskId: t.id,
        detectedAt: now.toISOString(),
      };
    });
}

function detectAtRiskGoals(goals: GoalRow[], cfg: RiskEngineConfig, now: Date): RiskAlert[] {
  const today = now.toISOString().slice(0, 10);
  return goals
    .filter((g) => {
      if (g.status === 'done' || g.progress >= 100) return false;
      if (!g.end_date) return false;
      const daysLeft = daysBetween(today, new Date(g.end_date));
      return daysLeft <= cfg.goalAtRiskDaysBeforeEnd && g.progress < cfg.goalAtRiskProgress;
    })
    .map((g) => {
      const daysLeft = daysBetween(today, new Date(g.end_date!));
      const isOverdue = daysLeft < 0;
      const severity: RiskSeverity = isOverdue ? 'critical' : 'warning';
      const score = isOverdue
        ? 85 + Math.min(Math.abs(daysLeft) * 2, 15)
        : 50 + (cfg.goalAtRiskDaysBeforeEnd - daysLeft) * 5;
      return {
        id: deterministicId(isOverdue ? 'goal_overdue' : 'goal_at_risk', g.id, today),
        source: isOverdue ? 'goal_overdue' : 'goal_at_risk',
        severity,
        title: isOverdue ? `目标逾期: ${g.title}` : `目标风险: ${g.title}`,
        description: isOverdue
          ? `目标「${g.title}」已逾期 ${Math.abs(daysLeft)} 天，进度仅 ${Math.round(g.progress)}%`
          : `目标「${g.title}」仅剩 ${daysLeft} 天到期，进度 ${Math.round(g.progress)}%（阈值 ${cfg.goalAtRiskProgress}%）`,
        score: Math.min(score, 100),
        goalId: g.id,
        detectedAt: now.toISOString(),
      };
    });
}

function detectOverdueActionItems(items: ActionItemRow[], cfg: RiskEngineConfig, now: Date): RiskAlert[] {
  const today = now.toISOString().slice(0, 10);
  return items
    .filter((a) => {
      if (a.status === 'completed' || a.status === 'cancelled') return false;
      if (!a.due_date) return false;
      return a.due_date < today;
    })
    .map((a) => {
      const daysLate = daysBetween(a.due_date!, now);
      return {
        id: deterministicId('action_item_overdue', a.id, today),
        source: 'action_item_overdue' as const,
        severity: daysLate >= cfg.overdueCriticalDays ? 'critical' : 'warning',
        title: `行动项逾期: ${a.title}`,
        description: `行动项「${a.title}」已逾期 ${daysLate} 天，来源: ${a.source}`,
        score: Math.min(45 + daysLate * 5, 80),
        actionItemId: a.id,
        detectedAt: now.toISOString(),
      };
    });
}

// ─── Main Scanner ───

export function scanRisks(
  tasks: TaskRow[],
  goals: GoalRow[],
  actionItems: ActionItemRow[],
  existingAlerts: DeviationAlertRow[],
  config?: Partial<RiskEngineConfig>,
): RiskScanResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const now = new Date();

  if (!cfg.autoScan) {
    return { alerts: [], summary: { critical: 0, warning: 0, info: 0, total: 0 }, scannedAt: now.toISOString() };
  }

  // Dedup: skip if existing alert for same entity+type today
  const existingKeys = new Set(
    existingAlerts
      .filter((a) => !a.is_resolved && a.created_at.startsWith(todayISO()))
      .map((a) => `${a.alert_type}:${a.task_id ?? a.goal_id ?? ''}`),
  );

  const raw: RiskAlert[] = [
    ...detectOverdueTasks(tasks, cfg, now),
    ...detectStalledTasks(tasks, cfg, now),
    ...detectAtRiskGoals(goals, cfg, now),
    ...detectOverdueActionItems(actionItems, cfg, now),
  ];

  // Dedup against today's existing alerts
  const alerts = raw.filter((a) => {
    const key = `${a.source}:${a.taskId ?? a.goalId ?? a.actionItemId ?? ''}`;
    return !existingKeys.has(key);
  });

  // Sort by score desc
  alerts.sort((a, b) => b.score - a.score);

  const critical = alerts.filter((a) => a.severity === 'critical').length;
  const warning = alerts.filter((a) => a.severity === 'warning').length;
  const info = alerts.filter((a) => a.severity === 'info').length;

  return { alerts, summary: { critical, warning, info, total: alerts.length }, scannedAt: now.toISOString() };
}

// ─── Alert → DeviationAlert persistence helper ───

export function alertToDeviationInput(alert: RiskAlert): {
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  task_id: string | null;
  goal_id: string | null;
  is_read: boolean;
  is_resolved: boolean;
} {
  return {
    alert_type: alert.source,
    severity: alert.severity,
    message: `${alert.title} — ${alert.description}`,
    task_id: alert.taskId ?? null,
    goal_id: alert.goalId ?? null,
    is_read: false,
    is_resolved: false,
  };
}

// ─── L2: Risk Trajectory Prediction ───

export interface RiskTrajectory {
  alertId: string;
  /** Current risk score */
  currentScore: number;
  /** Predicted score in N days (extrapolated) */
  predictedScore: number;
  /** Days until crossing critical threshold (80), null if won't cross */
  daysToCritical: number | null;
  /** Trend direction */
  trend: 'improving' | 'stable' | 'deteriorating';
  /** Confidence 0-1 */
  confidence: number;
  /** Reason for prediction */
  reason: string;
}

// ─── Risk Snapshot Persistence (Supabase-first, localStorage fallback, DR-19) ───

const SNAPSHOT_KEY = 'tbh-risk-snapshots';
const MAX_SNAPSHOTS = 14; // Keep 14 days of history

interface RiskSnapshot {
  date: string;        // YYYY-MM-DD
  alerts: RiskAlert[];
}

/** Save risk snapshot to Supabase, fallback to localStorage */
export async function saveRiskSnapshot(alerts: RiskAlert[]): Promise<void> {
  const today = todayISO();

  // Try Supabase first
  try {
    const { supabase, isSupabaseConfigured } = await getSupabase();
    if (supabase && isSupabaseConfigured && isSupabaseConfigured()) {
      const teamId = localStorage.getItem('tbh_current_team_id') || '__default__';
      const { error } = await supabase
        .from('risk_snapshots')
        .upsert({
          snapshot_date: today,
          team_id: teamId,
          alerts: alerts,
          alert_count: alerts.length,
          critical_count: alerts.filter(a => a.severity === 'critical').length,
          warning_count: alerts.filter(a => a.severity === 'warning').length,
        }, { onConflict: 'snapshot_date,team_id' });
      if (!error) return; // Supabase save succeeded
      console.warn('[riskEngine] Supabase save failed, falling back to localStorage:', error.message);
    }
  } catch { /* supabase not available */ }

  // Fallback: localStorage
  const snapshots = loadRiskSnapshotsLocal();
  const filtered = snapshots.filter(s => s.date !== today);
  filtered.push({ date: today, alerts });
  filtered.sort((a, b) => b.date.localeCompare(a.date));
  const trimmed = filtered.slice(0, MAX_SNAPSHOTS);
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(trimmed));
  } catch { /* quota exceeded, ignore */ }
}

/** Load risk snapshots from Supabase, fallback to localStorage */
export async function loadRiskSnapshots(): Promise<RiskSnapshot[]> {
  // Try Supabase first
  try {
    const { supabase, isSupabaseConfigured } = await getSupabase();
    if (supabase && isSupabaseConfigured && isSupabaseConfigured()) {
      const teamId = localStorage.getItem('tbh_current_team_id') || '__default__';
      const { data, error } = await supabase
        .from('risk_snapshots')
        .select('snapshot_date, alerts')
        .eq('team_id', teamId)
        .order('snapshot_date', { ascending: false })
        .limit(MAX_SNAPSHOTS);
      if (!error && data && data.length > 0) {
        return data.map((row: { snapshot_date: string; alerts: RiskAlert[] }) => ({
          date: row.snapshot_date,
          alerts: row.alerts,
        }));
      }
    }
  } catch { /* supabase not available */ }

  // Fallback: localStorage
  return loadRiskSnapshotsLocal();
}

/** Sync localStorage-only loader (for backward compat) */
function loadRiskSnapshotsLocal(): RiskSnapshot[] {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RiskSnapshot[];
  } catch { return []; }
}

/**
 * Get the most recent previous snapshot (before today) for trajectory comparison.
 * Loads from Supabase with localStorage fallback.
 */
export async function getPreviousAlerts(): Promise<RiskAlert[]> {
  const today = todayISO();
  const snapshots = await loadRiskSnapshots();
  const prev = snapshots.find(s => s.date < today);
  if (prev) return prev.alerts;
  return [];
}

// Lazy Supabase import
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

/**
 * Predict risk trajectory based on historical alert patterns
 * Uses simple heuristics: if a task/goal has been flagged multiple times
 * or has been deteriorating, predict continued deterioration
 */
export function predictRiskTrajectories(
  currentAlerts: RiskAlert[],
  previousAlerts: RiskAlert[] = [],
): RiskTrajectory[] {
  // Match by source+entityId (not alert ID, which includes date)
  const previousByEntity = new Map<string, RiskAlert>();
  previousAlerts.forEach(a => {
    const key = `${a.source}:${a.taskId ?? a.goalId ?? a.actionItemId ?? ''}`;
    previousByEntity.set(key, a);
  });

  return currentAlerts.map(alert => {
    const entityKey = `${alert.source}:${alert.taskId ?? alert.goalId ?? alert.actionItemId ?? ''}`;
    const prev = previousByEntity.get(entityKey);
    const scoreDelta = prev ? alert.score - prev.score : 0;

    // Days between previous and current detection
    const daysBetweenAlerts = prev
      ? Math.max(1, (Date.now() - new Date(prev.detectedAt).getTime()) / (1000 * 60 * 60 * 24))
      : 1;
    const velocity = prev ? scoreDelta / daysBetweenAlerts : 0;

    // Predict 7-day score
    const predictedScore = Math.min(100, Math.max(0, alert.score + velocity * 7));

    // Days to critical (score 80)
    let daysToCritical: number | null = null;
    if (velocity > 0 && alert.score < 80) {
      daysToCritical = Math.ceil((80 - alert.score) / velocity);
    }

    let trend: RiskTrajectory['trend'] = 'stable';
    if (velocity > 3) trend = 'deteriorating';
    else if (velocity < -3) trend = 'improving';

    const reason = buildTrajectoryReason(alert, velocity, predictedScore, prev);

    return {
      alertId: alert.id,
      currentScore: alert.score,
      predictedScore: Math.round(predictedScore),
      daysToCritical,
      trend,
      confidence: Math.min(1, 0.3 + (prev ? 0.4 : 0) + (daysBetweenAlerts >= 2 ? 0.3 : 0)),
      reason,
    };
  });
}

function buildTrajectoryReason(
  alert: RiskAlert,
  velocity: number,
  predictedScore: number,
  prev: RiskAlert | undefined,
): string {
  const parts: string[] = [];

  if (prev) {
    const delta = alert.score - prev.score;
    if (delta > 0) parts.push(`风险评分上升${delta}分`);
    else if (delta < 0) parts.push(`风险评分下降${Math.abs(delta)}分`);
    else parts.push(`风险评分持平`);
  } else {
    parts.push(`新检测到的风险`);
  }

  if (velocity > 5) parts.push(`恶化速度较快(日均+${velocity.toFixed(1)}分)`);
  else if (velocity < -5) parts.push(`正在改善(日均${velocity.toFixed(1)}分)`);

  if (predictedScore >= 80) parts.push(`预计7天内达到严重级别`);
  else if (predictedScore >= 50) parts.push(`预计7天内达到警告级别`);

  if (alert.source === 'task_overdue') parts.push(`逾期任务通常持续恶化直至处理`);
  if (alert.source === 'goal_at_risk') parts.push(`目标风险需尽早干预以避免失败`);

  return parts.join('；');
}

// ─── Milestone Overdue Detection (was missing) ───

export interface MilestoneLike {
  id: string;
  title: string;
  dueDate: string | null;
  completed: boolean;
  goalId?: string;
}

export function detectMilestoneOverdue(
  milestones: MilestoneLike[],
  cfg: RiskEngineConfig = DEFAULT_CONFIG,
  now: Date = new Date(),
): RiskAlert[] {
  const today = now.toISOString().slice(0, 10);
  return milestones
    .filter(m => !m.completed && m.dueDate && m.dueDate < today)
    .map(m => {
      const daysLate = daysBetween(m.dueDate!, now);
      let severity: RiskSeverity = 'info';
      let score = 25;
      if (daysLate >= cfg.overdueCriticalDays) {
        severity = 'critical';
        score = 75 + Math.min(daysLate, 25);
      } else if (daysLate >= cfg.overdueWarningDays) {
        severity = 'warning';
        score = 45 + daysLate * 10;
      }
      return {
        id: deterministicId('milestone_overdue', m.id, today),
        source: 'milestone_overdue' as const,
        severity,
        title: `里程碑逾期: ${m.title}`,
        description: `里程碑「${m.title}」已逾期 ${daysLate} 天（截止: ${m.dueDate}）`,
        score: Math.min(score, 100),
        goalId: m.goalId,
        detectedAt: now.toISOString(),
      };
    });
}
