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

import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// --- Plan Definitions ---

export interface PlanLimits {
  aiQueriesPerDay: number;
  maxAgents: number;
  maxTeamMembers: number;
  maxProjects: number;
  maxDocs: number;
  advancedAnalytics: boolean;
  customWorkflows: boolean;
  sso: boolean;
  auditExport: boolean;
  prioritySupport: boolean;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    aiQueriesPerDay: 50,
    maxAgents: 3,
    maxTeamMembers: 5,
    maxProjects: 5,
    maxDocs: 20,
    advancedAnalytics: false,
    customWorkflows: false,
    sso: false,
    auditExport: false,
    prioritySupport: false,
  },
  pro: {
    aiQueriesPerDay: 500,
    maxAgents: 10,
    maxTeamMembers: 50,
    maxProjects: 50,
    maxDocs: 500,
    advancedAnalytics: true,
    customWorkflows: true,
    sso: false,
    auditExport: true,
    prioritySupport: true,
  },
  enterprise: {
    aiQueriesPerDay: -1, // unlimited
    maxAgents: -1,
    maxTeamMembers: -1,
    maxProjects: -1,
    maxDocs: -1,
    advancedAnalytics: true,
    customWorkflows: true,
    sso: true,
    auditExport: true,
    prioritySupport: true,
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
  docs: number;
  docsLimit: number;
}

// --- Fetch subscription ---

export async function fetchSubscription(userId: string): Promise<SubscriptionInfo> {
  if (!isSupabaseConfigured() || !supabase) {
    return { plan: 'free', status: 'active', currentPeriodEnd: null };
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
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
  if (!isSupabaseConfigured() || !supabase) {
    // Simulate moderate free usage
    return { aiQueries: 12 };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from('usage_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('event_type', 'ai_query')
    .gte('created_at', today.toISOString());

  if (error) return { aiQueries: 0 };

  return { aiQueries: count ?? 0 };
}

// --- Record usage event ---

export async function recordUsage(userId: string, eventType: string, detail?: Record<string, unknown>): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    // In demo mode, audit store already captures this
    return;
  }

  await supabase.from('usage_events').insert({
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

    default:
      return { allowed: true };
  }
}
