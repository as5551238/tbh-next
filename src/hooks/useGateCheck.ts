import { useState } from 'react';
import { hasFeature, isActionAllowed, getCurrentPlan, PLAN_LIMITS } from '@/lib/subscription';

/**
 * Unified gate check hook for freemium paywall.
 * Returns gate-checking functions + PaywallModal state.
 */
export function useGateCheck() {
  const [paywallReason, setPaywallReason] = useState('');
  const [paywallFeature, setPaywallFeature] = useState('');
  const [showPaywall, setShowPaywall] = useState(false);

  const showPaywallFor = (reason: string, feature?: string) => {
    setPaywallReason(reason);
    setPaywallFeature(feature ?? '');
    setShowPaywall(true);
  };

  const closePaywall = () => setShowPaywall(false);

  /** Check if a feature is available; if not, show paywall and return false */
  const requireFeature = (feature: string, reason: string): boolean => {
    if (!hasFeature(feature as never)) {
      showPaywallFor(reason, feature);
      return false;
    }
    return true;
  };

  /** Check if an action is within Free plan limits */
  const requireLimit = (action: string, currentCount: number, reason: string): boolean => {
    const plan = getCurrentPlan();
    const allowed = isActionAllowed(plan, action, {} as never);
    if (!allowed.allowed) {
      showPaywallFor(reason, action);
      return false;
    }
    const limits = PLAN_LIMITS[plan];
    if (limits) {
      const limitKey = action as keyof typeof limits;
      const limit = limits[limitKey];
      if (typeof limit === 'number' && limit !== -1 && currentCount >= limit) {
        showPaywallFor(reason, action);
        return false;
      }
    }
    return true;
  };

  return { showPaywall, paywallReason, paywallFeature, closePaywall, requireFeature, requireLimit };
}
