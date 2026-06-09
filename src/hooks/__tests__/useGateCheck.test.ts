// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: () => false,
  supabase: null,
}));

import { renderHook, act } from '@testing-library/react';
import { useGateCheck } from '@/hooks/useGateCheck';
import { setCurrentPlan, setFeatureFlagOverride } from '@/lib/subscription';

describe('useGateCheck', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('requireFeature returns true when feature is available', () => {
    setCurrentPlan('pro');
    const { result } = renderHook(() => useGateCheck());
    let allowed: boolean = false;
    act(() => { allowed = result.current.requireFeature('advancedAnalytics', '解锁高级分析'); });
    expect(allowed).toBe(true);
    expect(result.current.showPaywall).toBe(false);
  });

  it('requireFeature shows paywall when feature is not available', () => {
    setCurrentPlan('free');
    const { result } = renderHook(() => useGateCheck());
    let allowed: boolean = true;
    act(() => { allowed = result.current.requireFeature('advancedAnalytics', '升级可使用高级分析'); });
    expect(allowed).toBe(false);
    expect(result.current.showPaywall).toBe(true);
    expect(result.current.paywallReason).toBe('升级可使用高级分析');
    expect(result.current.paywallFeature).toBe('advancedAnalytics');
  });

  it('requireLimit returns true when within plan limit (using maxAgents key)', () => {
    setCurrentPlan('free');
    const { result } = renderHook(() => useGateCheck());
    let allowed: boolean = false;
    act(() => { allowed = result.current.requireLimit('maxAgents', 2, 'Agent数量已达上限'); });
    expect(allowed).toBe(true);
  });

  it('requireLimit shows paywall when count exceeds plan limit', () => {
    setCurrentPlan('free');
    const { result } = renderHook(() => useGateCheck());
    let allowed: boolean = true;
    act(() => { allowed = result.current.requireLimit('maxAgents', 3, 'Agent数量已达上限'); });
    expect(allowed).toBe(false);
    expect(result.current.showPaywall).toBe(true);
    expect(result.current.paywallReason).toBe('Agent数量已达上限');
  });

  it('requireLimit returns true for enterprise plan with unlimited (-1) limits', () => {
    setCurrentPlan('enterprise');
    const { result } = renderHook(() => useGateCheck());
    let allowed: boolean = false;
    act(() => { allowed = result.current.requireLimit('maxTeamMembers', 999, '团队人数已达上限'); });
    expect(allowed).toBe(true);
  });

  it('closePaywall hides the paywall modal', () => {
    setCurrentPlan('free');
    const { result } = renderHook(() => useGateCheck());
    act(() => { result.current.requireFeature('advancedAnalytics', '升级可使用高级分析'); });
    expect(result.current.showPaywall).toBe(true);
    act(() => { result.current.closePaywall(); });
    expect(result.current.showPaywall).toBe(false);
  });

  it('requireFeature respects feature flag override', () => {
    setCurrentPlan('pro');
    setFeatureFlagOverride('batchOperations', false);
    const { result } = renderHook(() => useGateCheck());
    let allowed: boolean = true;
    act(() => { allowed = result.current.requireFeature('batchOperations', '批量操作已被管理员禁用'); });
    expect(allowed).toBe(false);
    expect(result.current.showPaywall).toBe(true);
  });

  it('requireLimit shows paywall when isActionAllowed blocks the action', () => {
    setCurrentPlan('free');
    const { result } = renderHook(() => useGateCheck());
    let allowed: boolean = true;
    act(() => { allowed = result.current.requireLimit('advanced_analytics', 0, '高级分析需升级'); });
    expect(allowed).toBe(false);
    expect(result.current.showPaywall).toBe(true);
  });

  it('paywallFeature is set correctly from requireFeature', () => {
    setCurrentPlan('free');
    const { result } = renderHook(() => useGateCheck());
    act(() => { result.current.requireFeature('customWorkflows', '自定义工作流需升级'); });
    expect(result.current.paywallFeature).toBe('customWorkflows');
  });

  it('initial state has paywall closed', () => {
    const { result } = renderHook(() => useGateCheck());
    expect(result.current.showPaywall).toBe(false);
    expect(result.current.paywallReason).toBe('');
    expect(result.current.paywallFeature).toBe('');
  });
});
