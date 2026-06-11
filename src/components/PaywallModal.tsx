import { useState, useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { PLAN_LIMITS, PLAN_PRICES } from '@/lib/subscription';
import { initiateCheckout, CHECKOUT_PLANS } from '@/lib/payment';
import { useAppStore } from '@/stores/appStore';
import { X, Check, Crown, Zap, Building2 } from 'lucide-react';

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  reason: string;
  feature?: string;
}

const PLAN_ICONS: Record<string, ReactNode> = {
  free: <Zap size={18} />,
  pro: <Crown size={18} />,
  enterprise: <Building2 size={18} />,
};

export default function PaywallModal({ open, onClose, reason, feature }: PaywallModalProps) {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [checkingOut, setCheckingOut] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const authUser = useAppStore((s) => s.authUser);

  const handleUpgrade = async (planId: string) => {
    const plan = CHECKOUT_PLANS.find((p) => p.id === planId);
    if (!plan) return;
    setCheckingOut(true);
    try {
      const result = await initiateCheckout(
        plan.priceId,
        authUser?.id,
        authUser?.email,
      );
      if (!result.success) {
        alert('支付服务暂不可用，请联系管理员或稍后再试。');
      }
      // If success + url, initiateCheckout already did window.location.href redirect
    } catch {
      alert('支付服务异常，请稍后重试。');
    } finally {
      setCheckingOut(false);
    }
  };

  // Focus trap + Escape handler
  useEffect(() => {
    if (!open) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEscape);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="paywall-title" tabIndex={-1} className="relative z-10 w-full max-w-lg mx-4 rounded-2xl border border-border bg-surface shadow-2xl outline-none">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 id="paywall-title" className="text-lg font-extrabold text-text">升级解锁更多能力</h2>
            <p className="text-xs text-text-3 mt-0.5">{reason}</p>
          </div>
          <button onClick={onClose} aria-label="关闭" className="flex h-8 w-8 items-center justify-center rounded-lg text-text-3 hover:bg-surface-2">
            <X size={16} />
          </button>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 px-6 py-3">
          <button onClick={() => setBilling('monthly')} className={cn('rounded-lg px-4 py-1.5 text-xs font-semibold transition-all', billing === 'monthly' ? 'bg-primary text-white' : 'bg-surface-2 text-text-3')}>
            月付
          </button>
          <button onClick={() => setBilling('yearly')} className={cn('rounded-lg px-4 py-1.5 text-xs font-semibold transition-all', billing === 'yearly' ? 'bg-primary text-white' : 'bg-surface-2 text-text-3')}>
            年付 <span className="text-[9px] text-success">省17%</span>
          </button>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-3 gap-3 px-6 py-4">
          {(['free', 'pro', 'enterprise'] as const).map((plan) => {
            const limits = PLAN_LIMITS[plan];
            const price = PLAN_PRICES[plan];
            const isCurrentPlan = plan === 'free';
            const isFeatured = plan === 'pro';

            return (
              <div key={plan} className={cn('flex flex-col rounded-xl border p-4 transition-all', isFeatured ? 'border-primary shadow-lg shadow-primary/10 ring-1 ring-primary/30' : 'border-border', isCurrentPlan && 'opacity-60')}>
                <div className="flex items-center gap-1.5 mb-2">
                  {PLAN_ICONS[plan]}
                  <span className="text-xs font-bold text-text">{price.label}</span>
                </div>
                <div className="mb-3">
                  <span className="text-2xl font-extrabold text-text">
                    ${billing === 'monthly' ? price.monthly : Math.round(price.yearly / 12)}
                  </span>
                  <span className="text-[10px] text-text-3">/用户/月</span>
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] text-text-2">
                    <Check size={10} className="text-success shrink-0" />
                    <span>{limits.aiQueriesPerDay === -1 ? '无限' : limits.aiQueriesPerDay} AI查询/日</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-text-2">
                    <Check size={10} className="text-success shrink-0" />
                    <span>{limits.maxAgents === -1 ? '无限' : limits.maxAgents}个Agent</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-text-2">
                    <Check size={10} className="text-success shrink-0" />
                    <span>{limits.maxTeamMembers === -1 ? '无限' : limits.maxTeamMembers}人团队</span>
                  </div>
                  {limits.advancedAnalytics && (
                    <div className="flex items-center gap-1.5 text-[10px] text-text-2">
                      <Check size={10} className="text-success shrink-0" /><span>高级分析</span>
                    </div>
                  )}
                  {limits.customWorkflows && (
                    <div className="flex items-center gap-1.5 text-[10px] text-text-2">
                      <Check size={10} className="text-success shrink-0" /><span>自定义工作流</span>
                    </div>
                  )}
                  {limits.sso && (
                    <div className="flex items-center gap-1.5 text-[10px] text-text-2">
                      <Check size={10} className="text-success shrink-0" /><span>SSO集成</span>
                    </div>
                  )}
                  {limits.auditExport && (
                    <div className="flex items-center gap-1.5 text-[10px] text-text-2">
                      <Check size={10} className="text-success shrink-0" /><span>审计导出</span>
                    </div>
                  )}
                  {limits.prioritySupport && (
                    <div className="flex items-center gap-1.5 text-[10px] text-text-2">
                      <Check size={10} className="text-success shrink-0" /><span>优先支持</span>
                    </div>
                  )}
                </div>
                <button
                  className={cn('mt-3 w-full rounded-lg py-2 text-[11px] font-bold transition-all',
                    isCurrentPlan ? 'bg-surface-2 text-text-3 cursor-default' :
                    isFeatured ? 'bg-gradient-to-r from-primary to-accent text-white hover:shadow-lg hover:shadow-primary/20' :
                    'bg-primary/10 text-primary-2 hover:bg-primary/20'
                  )}
                  disabled={isCurrentPlan || checkingOut}
                  onClick={() => {
                    if (isCurrentPlan) return;
                    const planKey = `${plan}_${billing}` as 'pro_monthly' | 'pro_yearly' | 'enterprise_monthly' | 'enterprise_yearly';
                    handleUpgrade(planKey);
                  }}
                >
                  {isCurrentPlan ? '当前方案' : checkingOut ? '处理中...' : '升级'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-3 text-center">
          <p className="text-[10px] text-text-3">7天无理由退款 · 随时降级 · 数据安全</p>
        </div>
      </div>
    </div>
  );
}
