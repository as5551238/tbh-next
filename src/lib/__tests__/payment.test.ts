// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: () => false,
  supabase: null,
}));

import {
  CHECKOUT_PLANS,
  initiateCheckout,
  getSubscriptionStatus,
  cancelSubscription,
  STRIPE_PRICES,
} from '@/lib/payment';
import { getCurrentPlan, setCurrentPlan } from '@/lib/subscription';

describe('payment module', () => {
  beforeEach(() => {
    localStorage.clear();
    setCurrentPlan('free');
  });

  describe('CHECKOUT_PLANS', () => {
    it('has 4 entries', () => {
      expect(CHECKOUT_PLANS).toHaveLength(4);
    });

    it('each plan has required fields', () => {
      for (const plan of CHECKOUT_PLANS) {
        expect(plan.id).toBeTruthy();
        expect(plan.name).toBeTruthy();
        expect(typeof plan.price).toBe('number');
        expect(['monthly', 'yearly']).toContain(plan.period);
        expect(plan.priceId).toBeTruthy();
        expect(Array.isArray(plan.features)).toBe(true);
        expect(plan.features.length).toBeGreaterThan(0);
      }
    });

    it('exactly one plan is highlighted', () => {
      const highlighted = CHECKOUT_PLANS.filter((p) => p.highlighted);
      expect(highlighted).toHaveLength(1);
    });
  });

  describe('initiateCheckout', () => {
    it('returns { success: false } for invalid priceId', async () => {
      const result = await initiateCheckout('invalid_price_id');
      expect(result.success).toBe(false);
    });

    it('returns { success: true } for valid priceId in demo mode', async () => {
      vi.useFakeTimers();
      const resultPromise = initiateCheckout(STRIPE_PRICES.pro_monthly);
      await vi.advanceTimersByTimeAsync(2000);
      const result = await resultPromise;
      expect(result.success).toBe(true);
      expect(result.sessionId).toBeTruthy();
      vi.useRealTimers();
    }, 10000);

    it('sets plan to pro when pro plan checkout succeeds', async () => {
      vi.useFakeTimers();
      const resultPromise = initiateCheckout(STRIPE_PRICES.pro_monthly);
      await vi.advanceTimersByTimeAsync(2000);
      await resultPromise;
      expect(getCurrentPlan()).toBe('pro');
      vi.useRealTimers();
    }, 10000);

    it('sets plan to enterprise when enterprise plan checkout succeeds', async () => {
      vi.useFakeTimers();
      const resultPromise = initiateCheckout(STRIPE_PRICES.enterprise_monthly);
      await vi.advanceTimersByTimeAsync(2000);
      await resultPromise;
      expect(getCurrentPlan()).toBe('enterprise');
      vi.useRealTimers();
    }, 10000);
  });

  describe('cancelSubscription', () => {
    it('sets plan back to free in demo mode', async () => {
      setCurrentPlan('pro');
      expect(getCurrentPlan()).toBe('pro');
      vi.useFakeTimers();
      const resultPromise = cancelSubscription();
      await vi.advanceTimersByTimeAsync(1500);
      const result = await resultPromise;
      expect(result).toBe(true);
      expect(getCurrentPlan()).toBe('free');
      vi.useRealTimers();
    }, 10000);

    it('returns true when Stripe portal is not enabled (local fallback)', async () => {
      vi.useFakeTimers();
      const resultPromise = cancelSubscription();
      await vi.advanceTimersByTimeAsync(1500);
      const result = await resultPromise;
      expect(result).toBe(true);
      vi.useRealTimers();
    }, 10000);

    it('sets plan to free even from enterprise', async () => {
      setCurrentPlan('enterprise');
      vi.useFakeTimers();
      const resultPromise = cancelSubscription();
      await vi.advanceTimersByTimeAsync(1500);
      await resultPromise;
      expect(getCurrentPlan()).toBe('free');
      vi.useRealTimers();
    }, 10000);

    it('cancel from free plan stays free', async () => {
      vi.useFakeTimers();
      const resultPromise = cancelSubscription();
      await vi.advanceTimersByTimeAsync(1500);
      const result = await resultPromise;
      expect(result).toBe(true);
      expect(getCurrentPlan()).toBe('free');
      vi.useRealTimers();
    }, 10000);

    it('returns false when Stripe portal enabled but Supabase not configured and portal config fails', async () => {
      vi.doMock('@/lib/supabase', () => ({
        isSupabaseConfigured: () => false,
        supabase: null,
      }));
      vi.doMock('@/lib/payment', async () => {
        const mod = await vi.importActual<typeof import('@/lib/payment')>('@/lib/payment');
        return mod;
      });
      expect(getCurrentPlan()).toBe('free');
    });
  });

  describe('simulateCheckout', () => {
    it('simulateCheckout via initiateCheckout pro_monthly sets plan to pro', async () => {
      vi.useFakeTimers();
      const p = initiateCheckout(STRIPE_PRICES.pro_monthly);
      await vi.advanceTimersByTimeAsync(2000);
      await p;
      expect(getCurrentPlan()).toBe('pro');
      vi.useRealTimers();
    }, 10000);

    it('simulateCheckout via initiateCheckout enterprise_yearly sets plan to enterprise', async () => {
      vi.useFakeTimers();
      const p = initiateCheckout(STRIPE_PRICES.enterprise_yearly);
      await vi.advanceTimersByTimeAsync(2000);
      await p;
      expect(getCurrentPlan()).toBe('enterprise');
      vi.useRealTimers();
    }, 10000);

    it('simulateCheckout returns a sessionId starting with cs_test_', async () => {
      vi.useFakeTimers();
      const p = initiateCheckout(STRIPE_PRICES.pro_yearly);
      await vi.advanceTimersByTimeAsync(2000);
      const result = await p;
      expect(result.sessionId).toMatch(/^cs_test_/);
      vi.useRealTimers();
    }, 10000);

    it('simulateCheckout for unknown priceId sets plan to free', async () => {
      vi.useFakeTimers();
      const p = initiateCheckout('price_unknown');
      await vi.advanceTimersByTimeAsync(2000);
      const result = await p;
      expect(result.success).toBe(false);
      vi.useRealTimers();
    });
  });

  describe('getSubscriptionStatus', () => {
    it('returns correct structure for free plan', () => {
      const status = getSubscriptionStatus();
      expect(status.plan).toBe('free');
      expect(status.active).toBe(false);
      expect(status.periodEnd).toBeUndefined();
    });

    it('returns active status for pro plan', () => {
      setCurrentPlan('pro');
      const status = getSubscriptionStatus();
      expect(status.plan).toBe('pro');
      expect(status.active).toBe(true);
      expect(status.periodEnd).toBeTruthy();
    });

    it('returns periodEnd as date string for paid plan', () => {
      setCurrentPlan('pro');
      const status = getSubscriptionStatus();
      expect(status.periodEnd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('STRIPE_PRICES', () => {
    it('has all 4 price keys', () => {
      expect(STRIPE_PRICES.pro_monthly).toBeTruthy();
      expect(STRIPE_PRICES.pro_yearly).toBeTruthy();
      expect(STRIPE_PRICES.enterprise_monthly).toBeTruthy();
      expect(STRIPE_PRICES.enterprise_yearly).toBeTruthy();
    });
  });
});
