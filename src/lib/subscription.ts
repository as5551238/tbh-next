/**
 * Subscription & Usage management.
 *
 * Plans:
 * - Free: 50 AI queries/day, 3 agents, 5 team members, basic reports
 * - Pro ($29/user/mo): 500 AI queries/day, 10 agents, 50 members, advanced analytics
 * - Enterprise (custom): Unlimited, SSO, audit export, SLA
 *
 * When Supabase is configured, reads from subscriptions + usage_events tables.
 * Otherwise falls back to local mock with Free plan defaults.
 */

import { fetchSubscriptionByUserId, fetchUsageEventCount, recordUsageEvent } from '@/lib/dataLayer';
import { isSupabaseConfigured } from '@/lib/supabase';

// --- Plan Definitions ---

export interface PlanLimits {
  aiQueriesPerDay: number;
  maxAgents: number;
  maxTeamMembers: number;
  maxProjects: number;
  maxGoals: number;
  maxTasks: number;
  maxDocs: number;
  advancedAnalytics: boolean;
  customWorkflows: boolean;
  sso: boolean;
  auditExport: boolean;
  prioritySupport: boolean;
  batchOperations: boolean;
  customReports: boolean;
  apiAccess: boolean;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    aiQueriesPerDay: 50,
    maxAgents: 3,
    maxTeamMembers: 5,
    maxProjects: 5,
    maxGoals: 5,
    maxTasks: 20,
    maxDocs: 20,
    advancedAnalytics: false,
    customWorkflows: false,
    sso: false,
    auditExport: false,
    prioritySupport: false,
    batchOperations: false,
    customReports: false,
    apiAccess: false,
  },
  pro: {
    aiQueriesPerDay: 500,
    maxAgents: 10,
    maxTeamMembers: 50,
    maxProjects: 50,
    maxGoals: 50,
    maxTasks: 500,
    maxDocs: 500,
    advancedAnalytics: true,
    customWorkflows: true,
    sso: false,
    auditExport: true,
    prioritySupport: true,
    batchOperations: true,
    customReports: true,
    apiAccess: true,
  },
  enterprise: {
    aiQueriesPerDay: -1,
    maxAgents: -1,
    maxTeamMembers: -1,
    maxProjects: -1,
    maxGoals: -1,
    maxTasks: -1,
    maxDocs: -1,
    advancedAnalytics: true,
    customWorkflows: true,
    sso: true,
    auditExport: true,
    prioritySupport: true,
    batchOperations: true,
    customReports: true,
    apiAccess: true,
  },
};

export const PLAN_PRICES: Record<string, { monthly: number; yearly: number; label: string }> = {
  free: { monthly: 0, yearly: 0, label: '免费版' },
  pro: { monthly: 29, yearly: 290, label: '专业版' },
  enterprise: { monthly: 99, yearly: 990, label: '企业版' },
};

// --- Types ---

export interface SubscriptionInfo {
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
}

export interface UsageSummary {
  aiQueries: number;
  aiQueriesLimit: number;
  agents: number;
  agentsLimit: number;
  teamMembers: number;
  teamMembersLimit: number;
  projects: number;
  projectsLimit: number;
  goals: number;
  tasks: number;
  docs: number;
  docsLimit: number;
}

// --- Fetch subscription ---

export async function fetchSubscription(userId: string): Promise<SubscriptionInfo> {
  const data = await fetchSubscriptionByUserId(userId);

  if (!data) {
    return { plan: 'free', status: 'active', currentPeriodEnd: null };
  }

  return {
    plan: data.plan ?? 'free',
    status: data.status ?? 'active',
    currentPeriodEnd: data.current_period_end,
  };
}

// --- Fetch usage ---

export async function fetchUsageToday(userId: string): Promise<{ aiQueries: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const count = await fetchUsageEventCount(userId, 'ai_query', today.toISOString());
  // When Supabase is not configured, fetchUsageEventCount returns 0 and we simulate
  return { aiQueries: count || 12 };
}

// --- Record usage event ---

export async function recordUsage(userId: string, eventType: string, detail?: Record<string, unknown>): Promise<void> {
  await recordUsageEvent({
    user_id: userId,
    event_type: eventType,
    detail: detail ?? {},
  });
}

// --- Check if action is allowed ---

export function isActionAllowed(plan: string, action: string, currentUsage: UsageSummary): { allowed: boolean; reason?: string } {
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

  switch (action) {
    case 'ai_query':
      if (limits.aiQueriesPerDay === -1) return { allowed: true };
      if (currentUsage.aiQueries >= limits.aiQueriesPerDay) {
        return { allowed: false, reason: `今日AI查询已达上限（${limits.aiQueriesPerDay}次），升级专业版可获得更多额度` };
      }
      return { allowed: true };

    case 'add_agent':
      if (limits.maxAgents === -1) return { allowed: true };
      if (currentUsage.agents >= limits.maxAgents) {
        return { allowed: false, reason: `Agent数量已达上限（${limits.maxAgents}个），升级可解锁更多` };
      }
      return { allowed: true };

    case 'add_goal':
      if (limits.maxGoals === -1) return { allowed: true };
      if (currentUsage.goals >= limits.maxGoals) {
        return { allowed: false, reason: `目标数量已达上限（${limits.maxGoals}个），升级可解锁更多` };
      }
      return { allowed: true };

    case 'add_task':
      if (limits.maxTasks === -1) return { allowed: true };
      if (currentUsage.tasks >= limits.maxTasks) {
        return { allowed: false, reason: `任务数量已达上限（${limits.maxTasks}个），升级专业版可获得更多额度` };
      }
      return { allowed: true };
    case 'add_member':
      if (limits.maxTeamMembers === -1) return { allowed: true };
      if (currentUsage.teamMembers >= limits.maxTeamMembers) {
        return { allowed: false, reason: `团队人数已达上限（${limits.maxTeamMembers}人），升级可扩展团队` };
      }
      return { allowed: true };

    case 'advanced_analytics':
      return { allowed: limits.advancedAnalytics, reason: limits.advancedAnalytics ? undefined : '高级分析需要专业版或企业版' };

    case 'custom_workflows':
      return { allowed: limits.customWorkflows, reason: limits.customWorkflows ? undefined : '自定义工作流需要专业版或企业版' };

    case 'sso':
      return { allowed: limits.sso, reason: limits.sso ? undefined : 'SSO集成仅限企业版' };

    case 'audit_export':
      return { allowed: limits.auditExport, reason: limits.auditExport ? undefined : '审计日志导出需要专业版或企业版' };

    case 'batch_operations':
      return { allowed: limits.batchOperations, reason: limits.batchOperations ? undefined : '批量操作需要专业版或企业版' };

    case 'custom_reports':
      return { allowed: limits.customReports, reason: limits.customReports ? undefined : '自定义报告需要专业版或企业版' };

    case 'api_access':
      return { allowed: limits.apiAccess, reason: limits.apiAccess ? undefined : 'API访问需要专业版或企业版' };

    default:
      return { allowed: true };
  }
}

// --- Get current plan (server-verified with localStorage cache fallback) ---

const SUB_PLAN_KEY = 'tbh-sub-plan';
const SUB_PLAN_VERIFIED_KEY = 'tbh-sub-plan-verified';
const SUB_PLAN_EXPIRY_KEY = 'tbh-sub-plan-expiry';
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCachedVerifiedPlan(): string | null {
  try {
    const expiry = localStorage.getItem(SUB_PLAN_EXPIRY_KEY);
    if (expiry && Date.now() < Number(expiry)) {
      return localStorage.getItem(SUB_PLAN_VERIFIED_KEY);
    }
  } catch {}
  return null;
}

function setCachedVerifiedPlan(plan: string): void {
  localStorage.setItem(SUB_PLAN_VERIFIED_KEY, plan);
  localStorage.setItem(SUB_PLAN_EXPIRY_KEY, String(Date.now() + CACHE_TTL_MS));
}

export function getCurrentPlan(): string {
  const verified = getCachedVerifiedPlan();
  if (verified) return verified;
  return localStorage.getItem(SUB_PLAN_KEY) || 'free';
}

export function setCurrentPlan(plan: string): void {
  localStorage.setItem(SUB_PLAN_KEY, plan);
  localStorage.setItem(SUB_PLAN_VERIFIED_KEY, plan);
  localStorage.setItem(SUB_PLAN_EXPIRY_KEY, String(Date.now() + CACHE_TTL_MS));
}

export async function refreshPlanFromServer(userId: string): Promise<string> {
  if (!isSupabaseConfigured()) {
    return getCurrentPlan();
  }
  try {
    const info = await fetchSubscription(userId);
    if (info.plan) {
      setCachedVerifiedPlan(info.plan);
      localStorage.setItem(SUB_PLAN_KEY, info.plan);
      return info.plan;
    }
  } catch {}
  return getCurrentPlan();
}

/** Quick feature gate check (synchronous). Returns true if the current plan allows the feature AND it is not disabled by admin flag override. */
export function hasFeature(feature: keyof PlanLimits): boolean {
  // L1: Admin flag override — if explicitly disabled, block regardless of plan
  if (feature in _flagOverrides && _flagOverrides[feature] === false) return false;

  // L2: Plan-based check
  const plan = getCurrentPlan();
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
  const val = limits[feature];
  return typeof val === 'boolean' ? val : val === -1;
}

// --- Feature Flag Override Layer ---
// Admin can force-disable features via FeatureFlagsContent regardless of plan.
// This in-memory map is persisted to localStorage for cross-session durability.

const FLAG_OVERRIDE_KEY = 'tbh-flag-overrides';
const _flagOverrides: Partial<Record<keyof PlanLimits, boolean>> = _loadFlagOverrides();

function _loadFlagOverrides(): Partial<Record<keyof PlanLimits, boolean>> {
  try {
    const raw = localStorage.getItem(FLAG_OVERRIDE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function _persistFlagOverrides(): void {
  localStorage.setItem(FLAG_OVERRIDE_KEY, JSON.stringify(_flagOverrides));
}

/** Set or clear a feature flag override. `enabled=true` removes the override, `enabled=false` forces the feature off. */
export function setFeatureFlagOverride(feature: keyof PlanLimits, enabled: boolean): void {
  if (enabled) {
    delete _flagOverrides[feature];
  } else {
    _flagOverrides[feature] = false;
  }
  _persistFlagOverrides();
}

/** Get all current flag overrides (for debugging / admin UI). */
export function getFeatureFlagOverrides(): Readonly<Partial<Record<keyof PlanLimits, boolean>>> {
  return { ..._flagOverrides };
}

/** Map from feature_flags.key (DB) → PlanLimits key, for bridging admin UI to runtime. */
export const FLAG_KEY_TO_FEATURE: Record<string, keyof PlanLimits> = {
  advanced_analytics: 'advancedAnalytics',
  custom_workflows: 'customWorkflows',
  sso: 'sso',
  audit_export: 'auditExport',
  priority_support: 'prioritySupport',
  batch_operations: 'batchOperations',
  custom_reports: 'customReports',
  api_access: 'apiAccess',
};
