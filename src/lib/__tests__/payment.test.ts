// @vitest/environments jsdom
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

    it('returns failure when Stripe is unavailable (no local bypass)', async () => {
      const result = await initiateCheckout(STRIPE_PRICES.pro_monthly);
      // SECURITY: Without Supabase/Stripe, checkout must fail — no simulateCheckout bypass
      expect(result.success).toBe(false);
    });

    it('does not change plan when checkout fails', async () => {
      setCurrentPlan('free');
      await initiateCheckout(STRIPE_PRICES.pro_monthly);
      expect(getCurrentPlan()).toBe('free');
    });
  });

  describe('cancelSubscription', () => {
    it('returns false when Stripe portal is unavailable (no local bypass)', async () => {
      const result = await cancelSubscription();
      // SECURITY: cancel must go through Stripe portal, no local downgrade
      expect(result).toBe(false);
    });

    it('does not change plan when cancel fails', async () => {
      setCurrentPlan('pro');
      await cancelSubscription();
      // Plan should NOT be changed without server verification
      expect(getCurrentPlan()).toBe('pro');
    });
  });

  describe('getSubscriptionStatus', () => {
    it('returns correct structure for free plan', () => {
      const status = getSubscriptionStatus();
      expect(status.plan).toBe('free');
      expect(status.active).toBe(false);
      expect(status.periodEnd).toBeUndefined();
    });

    it('returns active status for pro plan without fabricated periodEnd', () => {
      setCurrentPlan('pro');
      const status = getSubscriptionStatus();
      expect(status.plan).toBe('pro');
      expect(status.active).toBe(true);
      // SECURITY: no client-side periodEnd fabrication
      expect(status.periodEnd).toBeUndefined();
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
