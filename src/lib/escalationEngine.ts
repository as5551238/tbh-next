/**
 * L3 Escalation Policy Engine — automated risk escalation rules.
 *
 * Checks active alerts against configurable policies and produces
 * EscalationAction objects for notification/assignment changes.
 *
 * DR-51: toggle-gated; DR-53: data drives action
 */

import type { RiskAlert, RiskSeverity } from './riskEngine';

// ─── Types ───

export type EscalationLevel = 'L1_team' | 'L2_manager' | 'L3_executive';

export interface EscalationPolicy {
  id: string;
  name: string;
  /** Minimum severity to trigger */
  minSeverity: RiskSeverity;
  /** Minimum risk score to trigger */
  minScore: number;
  /** Target escalation level */
  level: EscalationLevel;
  /** Description shown in UI */
  description: string;
  /** Suggested action template */
  actionTemplate: string;
}

export interface EscalationAction {
  policyId: string;
  policyName: string;
  alertId: string;
  alertTitle: string;
  severity: RiskSeverity;
  score: number;
  level: EscalationLevel;
  action: string;
  triggeredAt: string;
}

export interface RiskPortfolioSummary {
  totalAlerts: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  avgScore: number;
  topRisks: RiskAlert[];
  escalationReady: number;
}

// ─── Default Policies ───

export const DEFAULT_POLICIES: EscalationPolicy[] = [
  {
    id: 'ep_critical_exec',
    name: '紧急风险上报高管',
    minSeverity: 'critical',
    minScore: 90,
    level: 'L3_executive',
    description: '评分≥90的紧急风险自动上报高管层',
    actionTemplate: '【紧急】风险"{title}"评分{score}，需高管介入决策',
  },
  {
    id: 'ep_critical_mgr',
    name: '紧急风险通知管理者',
    minSeverity: 'critical',
    minScore: 70,
    level: 'L2_manager',
    description: '评分≥70的紧急风险通知部门管理者',
    actionTemplate: '风险"{title}"评分{score}，请安排资源处理',
  },
  {
    id: 'ep_warning_team',
    name: '警告风险团队关注',
    minSeverity: 'warning',
    minScore: 50,
    level: 'L1_team',
    description: '评分≥50的警告风险推送到团队频道',
    actionTemplate: '团队注意：风险"{title}"评分{score}，请相关人员跟进',
  },
];

// ─── Core Engine ───

const SEVERITY_RANK: Record<RiskSeverity, number> = { critical: 3, warning: 2, info: 1 };
const LEVEL_RANK: Record<EscalationLevel, number> = { L1_team: 1, L2_manager: 2, L3_executive: 3 };

/**
 * Check alerts against escalation policies. Returns actions to execute.
 */
export function checkEscalations(
  alerts: RiskAlert[],
  policies: EscalationPolicy[] = DEFAULT_POLICIES,
): EscalationAction[] {
  const actions: EscalationAction[] = [];

  for (const alert of alerts) {
    for (const policy of policies) {
      if (SEVERITY_RANK[alert.severity] >= SEVERITY_RANK[policy.minSeverity]
        && alert.score >= policy.minScore) {
        actions.push({
          policyId: policy.id,
          policyName: policy.name,
          alertId: alert.id,
          alertTitle: alert.title,
          severity: alert.severity,
          score: alert.score,
          level: policy.level,
          action: policy.actionTemplate
            .replace('{title}', alert.title)
            .replace('{score}', String(alert.score)),
          triggeredAt: new Date().toISOString(),
        });
      }
    }
  }

  // De-duplicate: keep highest escalation level per alert
  const best = new Map<string, EscalationAction>();
  for (const a of actions) {
    const existing = best.get(a.alertId);
    if (!existing || LEVEL_RANK[a.level] > LEVEL_RANK[existing.level]) {
      best.set(a.alertId, a);
    }
  }

  return Array.from(best.values()).sort((a, b) => b.score - a.score);
}

/**
 * Execute escalation actions (persist to localStorage + console log).
 * In production, would integrate with push channels.
 */
export async function executeEscalations(actions: EscalationAction[]): Promise<number> {
  if (actions.length === 0) return 0;

  // Persist to localStorage for audit trail
  const key = 'tbh_escalation_log';
  try {
    const existing: EscalationAction[] = JSON.parse(localStorage.getItem(key) ?? '[]');
    existing.push(...actions);
    // Keep last 200 entries
    const trimmed = existing.slice(-200);
    localStorage.setItem(key, JSON.stringify(trimmed));
  } catch {
    // localStorage unavailable
  }

  for (const action of actions) {
    console.warn(`[Escalation ${action.level}] ${action.action}`);
  }

  return actions.length;
}

/**
 * Compute risk portfolio summary from current alerts.
 */
export function computeRiskPortfolio(alerts: RiskAlert[]): RiskPortfolioSummary {
  const critical = alerts.filter(a => a.severity === 'critical');
  const warning = alerts.filter(a => a.severity === 'warning');
  const info = alerts.filter(a => a.severity === 'info');
  const avgScore = alerts.length > 0
    ? Math.round(alerts.reduce((s, a) => s + a.score, 0) / alerts.length)
    : 0;

  const escalationActions = checkEscalations(alerts);

  return {
    totalAlerts: alerts.length,
    criticalCount: critical.length,
    warningCount: warning.length,
    infoCount: info.length,
    avgScore,
    topRisks: [...alerts].sort((a, b) => b.score - a.score).slice(0, 5),
    escalationReady: escalationActions.length,
  };
}