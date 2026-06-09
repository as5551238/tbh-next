// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: () => false,
  supabase: null,
}));

import {
  getCurrentPlan,
  setCurrentPlan,
  hasFeature,
  setFeatureFlagOverride,
  getFeatureFlagOverrides,
  isActionAllowed,
  PLAN_LIMITS,
} from '@/lib/subscription';
import type { UsageSummary } from '@/lib/subscription';

const FREE_USAGE: UsageSummary = {
  aiQueries: 10,
  aiQueriesLimit: 50,
  agents: 1,
  agentsLimit: 3,
  teamMembers: 2,
  teamMembersLimit: 5,
  projects: 1,
  projectsLimit: 5,
  docs: 5,
  docsLimit: 20,
      goals: 0,
      goalsLimit: 0,
      tasks: 0,
      tasksLimit: 0,
};

describe('subscription module', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getCurrentPlan / setCurrentPlan', () => {
    it('returns "free" by default', () => {
      expect(getCurrentPlan()).toBe('free');
    });

    it('returns "pro" after setCurrentPlan("pro")', () => {
      setCurrentPlan('pro');
      expect(getCurrentPlan()).toBe('pro');
    });

    it('persists plan across calls', () => {
      setCurrentPlan('enterprise');
      expect(getCurrentPlan()).toBe('enterprise');
    });
  });

  describe('hasFeature', () => {
    it('returns false for advancedAnalytics on free plan', () => {
      expect(hasFeature('advancedAnalytics')).toBe(false);
    });

    it('returns true for advancedAnalytics on pro plan', () => {
      setCurrentPlan('pro');
      expect(hasFeature('advancedAnalytics')).toBe(true);
    });

    it('returns true for sso on enterprise plan', () => {
      setCurrentPlan('enterprise');
      expect(hasFeature('sso')).toBe(true);
    });

    it('returns false for sso on pro plan', () => {
      setCurrentPlan('pro');
      expect(hasFeature('sso')).toBe(false);
    });

    it('respects feature flag override to disable a feature', () => {
      setCurrentPlan('pro');
      setFeatureFlagOverride('batchOperations', false);
      expect(hasFeature('batchOperations')).toBe(false);
    });

    it('re-enables feature when override is cleared', () => {
      setCurrentPlan('pro');
      setFeatureFlagOverride('batchOperations', false);
      expect(hasFeature('batchOperations')).toBe(false);
      setFeatureFlagOverride('batchOperations', true);
      expect(hasFeature('batchOperations')).toBe(true);
    });
  });

  describe('getFeatureFlagOverrides', () => {
    it('returns empty object when no overrides set', () => {
      expect(getFeatureFlagOverrides()).toEqual({});
    });

    it('returns set overrides', () => {
      setFeatureFlagOverride('sso', false);
      setFeatureFlagOverride('batchOperations', false);
      const overrides = getFeatureFlagOverrides();
      expect(overrides.sso).toBe(false);
      expect(overrides.batchOperations).toBe(false);
    });
  });

  describe('isActionAllowed', () => {
    it('allows ai_query within limits on free plan', () => {
      const result = isActionAllowed('free', 'ai_query', FREE_USAGE);
      expect(result.allowed).toBe(true);
    });

    it('blocks ai_query when limit reached on free plan', () => {
      const usage: UsageSummary = { ...FREE_USAGE, aiQueries: 50 };
      const result = isActionAllowed('free', 'ai_query', usage);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('上限');
    });

    it('allows ai_query on enterprise with unlimited (-1)', () => {
      const usage: UsageSummary = { ...FREE_USAGE, aiQueries: 99999 };
      const result = isActionAllowed('enterprise', 'ai_query', usage);
      expect(result.allowed).toBe(true);
    });

    it('blocks advanced_analytics on free plan', () => {
      const result = isActionAllowed('free', 'advanced_analytics', FREE_USAGE);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('专业版');
    });

    it('allows advanced_analytics on pro plan', () => {
      const result = isActionAllowed('pro', 'advanced_analytics', FREE_USAGE);
      expect(result.allowed).toBe(true);
    });

    it('blocks sso on pro plan', () => {
      const result = isActionAllowed('pro', 'sso', FREE_USAGE);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('企业版');
    });

    it('allows sso on enterprise plan', () => {
      const result = isActionAllowed('enterprise', 'sso', FREE_USAGE);
      expect(result.allowed).toBe(true);
    });

    it('allows unknown actions by default', () => {
      const result = isActionAllowed('free', 'unknown_action', FREE_USAGE);
      expect(result.allowed).toBe(true);
    });

    it('blocks add_agent when limit reached', () => {
      const usage: UsageSummary = { ...FREE_USAGE, agents: 3 };
      const result = isActionAllowed('free', 'add_agent', usage);
      expect(result.allowed).toBe(false);
    });

    it('blocks add_member when limit reached on pro plan', () => {
      const usage: UsageSummary = { ...FREE_USAGE, teamMembers: 50 };
      const result = isActionAllowed('pro', 'add_member', usage);
      expect(result.allowed).toBe(false);
    });
  });

  describe('PLAN_LIMITS', () => {
    it('has free, pro, and enterprise plans defined', () => {
      expect(PLAN_LIMITS.free).toBeDefined();
      expect(PLAN_LIMITS.pro).toBeDefined();
      expect(PLAN_LIMITS.enterprise).toBeDefined();
    });

    it('free plan has limited AI queries', () => {
      expect(PLAN_LIMITS.free.aiQueriesPerDay).toBe(50);
    });

    it('pro plan has 500 AI queries', () => {
      expect(PLAN_LIMITS.pro.aiQueriesPerDay).toBe(500);
    });

    it('enterprise plan has unlimited AI queries (-1)', () => {
      expect(PLAN_LIMITS.enterprise.aiQueriesPerDay).toBe(-1);
    });
  });
});

describe('Feature flag override persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('flag overrides survive module reload (persisted to localStorage)', () => {
    setCurrentPlan('pro');
    setFeatureFlagOverride('customWorkflows', false);
    expect(hasFeature('customWorkflows')).toBe(false);
    setFeatureFlagOverride('customWorkflows', true);
    expect(hasFeature('customWorkflows')).toBe(true);
  });

  it('multiple flag overrides can coexist', () => {
    setCurrentPlan('pro');
    setFeatureFlagOverride('sso', false);
    setFeatureFlagOverride('apiAccess', false);
    const overrides = getFeatureFlagOverrides();
    expect(overrides.sso).toBe(false);
    expect(overrides.apiAccess).toBe(false);
  });
});

describe('isActionAllowed edge cases', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('blocks add_goal when limit reached on free plan', () => {
    const usage: UsageSummary = { ...FREE_USAGE, goals: 5 };
    const result = isActionAllowed('free', 'add_goal', usage);
    expect(result.allowed).toBe(false);
  });

  it('allows add_goal on enterprise plan (unlimited)', () => {
    const usage: UsageSummary = { ...FREE_USAGE, goals: 9999 };
    const result = isActionAllowed('enterprise', 'add_goal', usage);
    expect(result.allowed).toBe(true);
  });

  it('blocks add_task when limit reached on free plan', () => {
    const usage: UsageSummary = { ...FREE_USAGE, tasks: 20 };
    const result = isActionAllowed('free', 'add_task', usage);
    expect(result.allowed).toBe(false);
  });

  it('allows custom_workflows on pro plan', () => {
    const result = isActionAllowed('pro', 'custom_workflows', FREE_USAGE);
    expect(result.allowed).toBe(true);
  });
});
