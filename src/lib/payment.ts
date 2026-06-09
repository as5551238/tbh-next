import { setCurrentPlan, getCurrentPlan } from '@/lib/subscription';
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
    name: '专业版',
    price: 29,
    period: 'monthly',
    priceId: STRIPE_PRICES.pro_monthly,
    features: ['500次/天AI查询', '10个Agent', '50人团队', '高级分析', '自定义工作流', '批量操作'],
  },
  {
    id: 'pro_yearly',
    name: '专业版(年付)',
    price: 290,
    period: 'yearly',
    priceId: STRIPE_PRICES.pro_yearly,
    features: ['500次/天AI查询', '10个Agent', '50人团队', '高级分析', '自定义工作流', '批量操作', '年付省17%'],
    highlighted: true,
  },
  {
    id: 'enterprise_monthly',
    name: '企业版',
    price: 99,
    period: 'monthly',
    priceId: STRIPE_PRICES.enterprise_monthly,
    features: ['无限AI查询', '无限Agent', '无限团队', 'SSO集成', '审计导出', 'API访问', '优先支持'],
  },
  {
    id: 'enterprise_yearly',
    name: '企业版(年付)',
    price: 990,
    period: 'yearly',
    priceId: STRIPE_PRICES.enterprise_yearly,
    features: ['无限AI查询', '无限Agent', '无限团队', 'SSO集成', '审计导出', 'API访问', '优先支持', '年付省17%'],
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

function simulateCheckout(priceId: string): { success: boolean; sessionId: string } {
  const tier = PLAN_MAP[priceId] ?? 'free';
  setCurrentPlan(tier);
  return { success: true, sessionId: `cs_test_${Date.now()}` };
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
      console.warn('Stripe checkout failed, falling back to demo mode:', err);
    }
  }

  await new Promise((r) => setTimeout(r, 1500));
  const fallback = simulateCheckout(priceId);
  return { success: fallback.success, sessionId: fallback.sessionId };
}

export function getSubscriptionStatus(): { plan: string; active: boolean; periodEnd?: string } {
  const plan = getCurrentPlan();
  return {
    plan,
    active: plan !== 'free',
    periodEnd: plan !== 'free' ? new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) : undefined,
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

  if (!STRIPE_PORTAL_CONFIG.enabled) {
    await new Promise((r) => setTimeout(r, 1000));
    setCurrentPlan('free');
    return true;
  }

  return false;
}
