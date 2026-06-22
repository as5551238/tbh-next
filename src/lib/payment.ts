import { getCurrentPlan } from '@/lib/subscription';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export const STRIPE_PRICES = {
  pro_monthly: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
  pro_yearly: import.meta.env.VITE_STRIPE_PRICE_PRO_YEARLY || 'price_pro_yearly',
  enterprise_monthly: import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE_MONTHLY || 'price_enterprise_monthly',
  enterprise_yearly: import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE_YEARLY || 'price_enterprise_yearly',
};

export const STRIPE_REDIRECT_URL =
  typeof window !== 'undefined' ? `${window.location.origin}/settings/billing` : '';

export const STRIPE_PORTAL_CONFIG = {
  flow: 'subscription_cancel',
  returnUrl: STRIPE_REDIRECT_URL,
  enabled: !!(import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY),
};

export interface CheckoutPlan {
  id: string;
  name: string;
  price: number;
  period: 'monthly' | 'yearly';
  priceId: string;
  features: string[];
  highlighted?: boolean;
}

export const CHECKOUT_PLANS: CheckoutPlan[] = [
  {
    id: 'pro_monthly',
    name: 'Pro',
    price: 29,
    period: 'monthly',
    priceId: STRIPE_PRICES.pro_monthly,
    features: ['feat500AiQueries', 'feat10Agents', 'feat50Team', 'featAdvancedAnalytics', 'featCustomWorkflow', 'featBatchOps'],
  },
  {
    id: 'pro_yearly',
    name: 'Pro (Yearly)',
    price: 290,
    period: 'yearly',
    priceId: STRIPE_PRICES.pro_yearly,
    features: ['feat500AiQueries', 'feat10Agents', 'feat50Team', 'featAdvancedAnalytics', 'featCustomWorkflow', 'featBatchOps', 'featYearlySave17'],
    highlighted: true,
  },
  {
    id: 'enterprise_monthly',
    name: 'Enterprise',
    price: 99,
    period: 'monthly',
    priceId: STRIPE_PRICES.enterprise_monthly,
    features: ['featUnlimitedAiQueries', 'featUnlimitedAgents', 'featUnlimitedTeam', 'featSso', 'featAuditExport', 'featApiAccess', 'featPrioritySupport'],
  },
  {
    id: 'enterprise_yearly',
    name: 'Enterprise (Yearly)',
    price: 990,
    period: 'yearly',
    priceId: STRIPE_PRICES.enterprise_yearly,
    features: ['featUnlimitedAiQueries', 'featUnlimitedAgents', 'featUnlimitedTeam', 'featSso', 'featAuditExport', 'featApiAccess', 'featPrioritySupport', 'featYearlySave17'],
  },
];

const PLAN_MAP: Record<string, string> = {
  price_pro_monthly: 'pro',
  price_pro_yearly: 'pro',
  price_enterprise_monthly: 'enterprise',
  price_enterprise_yearly: 'enterprise',
};

async function invokeStripeCheckout(
  priceId: string,
  userId: string,
  email?: string
): Promise<{ success: boolean; sessionId?: string; url?: string }> {
  if (!supabase || !isSupabaseConfigured()) {
    return { success: false };
  }

  const { data, error } = await supabase.functions.invoke('stripe-checkout', {
    body: { priceId, userId, email: email || undefined },
  });

  if (error) {
    console.error('Stripe checkout edge function error:', error);
    return { success: false };
  }

  if (!data?.sessionId) {
    console.error('No sessionId returned from stripe-checkout:', data);
    return { success: false };
  }

  return { success: true, sessionId: data.sessionId, url: data.url };
}

export async function initiateCheckout(
  priceId: string,
  userId?: string,
  email?: string
): Promise<{ success: boolean; sessionId?: string; url?: string }> {
  const plan = CHECKOUT_PLANS.find((p) => p.priceId === priceId);
  if (!plan) return { success: false };

  if (userId && isSupabaseConfigured()) {
    try {
      const result = await invokeStripeCheckout(priceId, userId, email);
      if (result.success && result.url) {
        window.location.href = result.url;
        return result;
      }
      if (result.success) {
        return result;
      }
    } catch (err) {
      console.error('Stripe checkout failed:', err);
    }
  }

  // SECURITY: No local bypass — if Stripe is unavailable, checkout fails.
  // Users cannot upgrade without a real payment.
  console.warn('支付服务不可用，请联系管理员或稍后再试');
  return { success: false };
}

export function getSubscriptionStatus(): { plan: string; active: boolean; periodEnd?: string } {
  const plan = getCurrentPlan();
  return {
    plan,
    active: plan !== 'free',
    // SECURITY: periodEnd only returned when verified from server
    // Fake periodEnd removed — no client-side date fabrication
  };
}

export async function cancelSubscription(customerId?: string, sessionId?: string): Promise<boolean> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-portal', {
        body: {
          customer_id: customerId || undefined,
          session_id: sessionId || undefined,
          returnUrl: STRIPE_REDIRECT_URL || window.location.origin,
        },
      });
      if (!error && data?.url && typeof window !== 'undefined') {
        window.location.href = data.url;
        return true;
      }
      console.warn('Stripe portal unavailable, using local fallback');
    } catch (err) {
      console.warn('Stripe portal failed, using local fallback:', err);
    }
  }

  // SECURITY: No local bypass — cancel must go through Stripe portal.
  // Client-side plan downgrade removed to prevent self-service abuse.
  return false;
}
