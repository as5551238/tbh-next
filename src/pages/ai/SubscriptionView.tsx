import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { PLAN_LIMITS, PLAN_PRICES, fetchSubscription, fetchUsageToday, type SubscriptionInfo, type UsageSummary, getCurrentPlan, setCurrentPlan } from '@/lib/subscription';
import { CHECKOUT_PLANS, initiateCheckout, cancelSubscription, getSubscriptionStatus } from '@/lib/payment';
import { upsertSubscription } from '@/lib/dataLayer';
import { Crown, Zap, Building2, TrendingUp, Users, Bot, FileText, FolderKanban, Lock, CheckCircle2, CreditCard } from 'lucide-react';
import { useAgentDetails, useMembers, useProjects, useKnowledgeDocs } from '@/hooks/useMatrix';
import { CardSkeleton } from '@/components/Skeleton';
import PaywallModal from '@/components/PaywallModal';

function CheckoutPlanCard({ plan, isCurrent, onCheckout }: { plan: typeof CHECKOUT_PLANS[number]; isCurrent: boolean; onCheckout: () => Promise<void> }) {
  const [processing, setProcessing] = useState(false);
  return (
    <div className={cn(
      'rounded-xl border p-4 transition-all',
      plan.highlighted ? 'border-primary/50 bg-primary/5' : 'border-border',
      isCurrent && 'ring-1 ring-success/30'
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-text">{plan.name}</span>
        {plan.highlighted && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[8px] font-bold text-primary-2">推荐</span>}
        {isCurrent && <span className="rounded-full bg-success/10 px-2 py-0.5 text-[8px] font-bold text-success">当前</span>}
      </div>
      <div className="mb-3">
        <span className="text-2xl font-extrabold text-text">${plan.price}</span>
        <span className="text-xs text-text-3">/{plan.period === 'monthly' ? '月' : '年'}</span>
      </div>
      <ul className="space-y-1 mb-3">
        {plan.features.map((f) => (
          <li key={f} className="flex flex-wrap items-center gap-1 text-[10px] text-text-2">
            <CheckCircle2 size={8} className="text-success shrink-0" />{f}
          </li>
        ))}
      </ul>
      {!isCurrent && (
        <button
          onClick={async () => { setProcessing(true); await onCheckout(); setProcessing(false); }}
          disabled={processing}
          className={cn(
            'w-full rounded-lg py-2 text-xs font-semibold transition-all',
            plan.highlighted ? 'bg-primary text-white hover:opacity-80' : 'bg-surface-2 text-text-2 hover:bg-surface-2/80',
            processing && 'opacity-60'
          )}
        >
          {processing ? '处理中...' : '立即订阅'}
        </button>
      )}
    </div>
  );
}

export default function SubscriptionView() {
  const [showPaywall, setShowPaywall] = useState(false);
  const { user } = useAuth();
  const { agents } = useAgentDetails();
  const { members } = useMembers();
  const { projects } = useProjects();
  const { docs: knowledgeDocs } = useKnowledgeDocs();
  const [sub, setSub] = useState<SubscriptionInfo>({ plan: 'free', status: 'active', currentPeriodEnd: null });
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);
  const [upgradeRequested, setUpgradeRequested] = useState<string | null>(null);

  const SUB_PLAN_KEY = 'tbh-sub-plan';

  useEffect(() => {
        async function load() {
        if (user?.id) {
        const [subInfo, usageToday] = await Promise.all([
          fetchSubscription(user.id),
          fetchUsageToday(user.id),
        ]);
        const effectivePlan = getCurrentPlan();
        const effectiveSub = { ...subInfo, plan: effectivePlan };
        setSub(effectiveSub);

        const limits = PLAN_LIMITS[effectivePlan] ?? PLAN_LIMITS.free;
        setUsage({
          aiQueries: usageToday.aiQueries,
          aiQueriesLimit: limits.aiQueriesPerDay,
          agents: agents.length,
          agentsLimit: limits.maxAgents,
          teamMembers: members.length,
          teamMembersLimit: limits.maxTeamMembers,
          projects: projects.length,
          projectsLimit: limits.maxProjects,
          docs: knowledgeDocs.length,
          docsLimit: limits.maxDocs,
          goals: 0,
          goalsLimit: limits.maxGoals ?? 0,
          tasks: 0,
          tasksLimit: 0,
        } as UsageSummary);
      }
      setLoading(false);
    }
    load();
  }, [user?.id]);

  if (loading) {
    return (
      <CardSkeleton />
    );
  }

  const limits = PLAN_LIMITS[sub.plan] ?? PLAN_LIMITS.free;
  const price = PLAN_PRICES[sub.plan];
  const planIcon = sub.plan === 'pro' ? <Crown size={20} className="text-primary-2" /> : sub.plan === 'enterprise' ? <Building2 size={20} className="text-accent" /> : <Zap size={20} className="text-warn" />;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-4 md:p-6">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        {/* Current plan */}
        <div className="rounded-xl border border-border p-5" style={{ background: `linear-gradient(135deg, var(--brand-accent) 0%, var(--status-success) 100%)` }}>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">{planIcon}</div>
            <div>
              <h2 className="text-lg font-extrabold text-text">{price.label}</h2>
              <p className="text-xs text-text-3">状态: {sub.status === 'active' ? '活跃' : '暂停'}</p>
            </div>
            <div className="ml-auto text-right">
              <div className="text-2xl font-extrabold text-text">${price.monthly}</div>
              <div className="text-[10px] text-text-3">/用户/月</div>
            </div>
          </div>

          {sub.currentPeriodEnd && (
            <p className="text-xs text-text-3">当前周期截止: {new Date(sub.currentPeriodEnd).toLocaleDateString('zh-CN')}</p>
          )}
        </div>

        {/* Usage meters */}
        {usage && (
          <div className="rounded-xl border border-border p-5">
            <h3 className="text-sm font-bold text-text mb-4">今日用量</h3>
            <div className="space-y-4">
              <UsageMeter icon={<Bot size={14} />} label="AI 查询" current={usage.aiQueries} limit={usage.aiQueriesLimit} color='var(--brand-accent)' />
              <UsageMeter icon={<Users size={14} />} label="团队成员" current={usage.teamMembers} limit={usage.teamMembersLimit} color='var(--status-success)' />
              <UsageMeter icon={<Bot size={14} />} label="Agent" current={usage.agents} limit={usage.agentsLimit} color="#ffc44d" />
              <UsageMeter icon={<FolderKanban size={14} />} label="项目" current={usage.projects} limit={usage.projectsLimit} color="#ff5c6a" />
              <UsageMeter icon={<FileText size={14} />} label="文档" current={usage.docs} limit={usage.docsLimit} color='var(--brand-accent)' />
            </div>
          </div>
        )}

        {/* Plan switcher */}
        <div className="rounded-xl border border-border p-5">
          <h3 className="text-sm font-bold text-text mb-4">选择方案</h3>
          <div className="grid grid-cols-3 gap-3">
            {(['free', 'pro', 'enterprise'] as const).map((p) => {
              const pPrice = PLAN_PRICES[p];
              const isCurrent = sub.plan === p;
              const isSwitching = switching === p;
              const isRequested = upgradeRequested === p;
              const isDowngrade = p === 'free' && sub.plan !== 'free';
              const isUpgrade = !isCurrent && p !== 'free';
              return (
                <div key={p} className={cn(
                  'rounded-xl border p-4 text-center transition-all',
                  isCurrent ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border',
                )}>
                  <div className="text-sm font-bold text-text mb-1">{pPrice.label}</div>
                  <div className="text-lg font-extrabold text-text">${pPrice.monthly}</div>
                  <div className="text-[9px] text-text-3">/用户/月</div>
                  {isCurrent && (
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[8px] font-bold text-primary-2">
                      <CheckCircle2 size={10} /> 当前方案
                    </div>
                  )}
                  {isUpgrade && !isRequested && (
                    <button
                      onClick={async () => {
                        setSwitching(p);
                        // In demo mode: grant immediate access for trial
                        // In production: this would redirect to Stripe Checkout
                        setCurrentPlan(p);
                        if (user?.id) {
                          await upsertSubscription({ user_id: user.id, plan: p, status: 'active' });
                        }
                        setSub((prev) => ({ ...prev, plan: p }));
                        const newLimits = PLAN_LIMITS[p];
                        setUsage((prev) => prev ? {
                          ...prev,
                          aiQueriesLimit: newLimits.aiQueriesPerDay,
                          agentsLimit: newLimits.maxAgents,
                          teamMembersLimit: newLimits.maxTeamMembers,
                          projectsLimit: newLimits.maxProjects,
                          docsLimit: newLimits.maxDocs,
                        } : null);
                        setUpgradeRequested(p);
                        setSwitching(null);
                      }}
                      disabled={isSwitching !== null}
                      className={cn(
                        'mt-2 w-full rounded-full px-2 py-1 text-[9px] font-semibold transition-all',
                        'bg-primary/20 text-primary-2 hover:bg-primary/30',
                        isSwitching && 'opacity-60'
                      )}
                    >
                      {isSwitching ? '处理中...' : '升级体验'}
                    </button>
                  )}
                  {isRequested && (
                    <div className="mt-2 rounded-full bg-accent/10 px-2 py-0.5 text-[8px] font-semibold text-accent">
                      已激活试用
                    </div>
                  )}
                  {isUpgrade && !isCurrent && !isRequested && !isSwitching && p !== ('free' as typeof p) && (
                    <div className="mt-1 flex flex-wrap items-center justify-center gap-0.5 text-[8px] text-text-3">
                      <Lock size={8} /> 需升级
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-text-3 mt-3">
            当前为试用模式，升级即时生效。正式版将通过Stripe安全支付，支持按月/按年付费。
          </p>
        </div>

        {/* Payment checkout */}
        <div className="rounded-xl border border-border p-5">
          <h3 className="text-sm font-bold text-text mb-4 flex flex-wrap items-center gap-2">
            <CreditCard size={14} className="text-primary-2" /> 选择方案并支付
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {CHECKOUT_PLANS.map((plan) => (
                <CheckoutPlanCard key={plan.id} plan={plan} isCurrent={(plan.id.includes('pro') && sub.plan === 'pro') || (plan.id.includes('enterprise') && sub.plan === 'enterprise')} onCheckout={async () => { await initiateCheckout(plan.priceId); setSub((prev) => ({ ...prev, plan: plan.id.includes('pro') ? 'pro' : 'enterprise' })); }} />
              ))}
          </div>
          <p className="text-[10px] text-text-3 mt-3">
            当前为演示模式，订阅即时生效。正式版将通过Stripe安全支付，支持信用卡/借记卡。
          </p>
        </div>

        {/* Feature matrix */}
        <div className="rounded-xl border border-border p-5">
          <h3 className="text-sm font-bold text-text mb-4">功能对比</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 text-left text-text-3 font-normal">功能</th>
                  <th className="py-2 text-center text-text-3 font-normal">免费版</th>
                  <th className="py-2 text-center font-semibold text-primary-2">专业版</th>
                  <th className="py-2 text-center text-text-3 font-normal">企业版</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['AI查询/日', '50', '500', '无限'],
                  ['Agent数量', '3', '10', '无限'],
                  ['团队人数', '5', '50', '无限'],
                  ['高级分析', '-', '✓', '✓'],
                  ['自定义工作流', '-', '✓', '✓'],
                  ['SSO集成', '-', '-', '✓'],
                  ['审计导出', '-', '✓', '✓'],
                  ['优先支持', '-', '✓', '✓'],
                ].map(([feature, free, pro, ent]) => (
                  <tr key={feature} className="border-b border-border/50">
                    <td className="py-2 text-text-2">{feature}</td>
                    <td className="py-2 text-center text-text-3">{free}</td>
                    <td className="py-2 text-center text-text font-semibold">{pro}</td>
                    <td className="py-2 text-center text-text-3">{ent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsageMeter({ icon, label, current, limit, color }: { icon: ReactNode; label: string; current: number; limit: number; color: string }) {
  const isUnlimited = limit === -1;
  const pct = isUnlimited ? 30 : Math.min(100, (current / limit) * 100);
  const isWarn = !isUnlimited && pct >= 80;
  const isDanger = !isUnlimited && pct >= 95;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-2">{icon}<span>{label}</span></div>
        <span className={cn('text-xs font-semibold', isDanger && 'text-danger', isWarn && 'text-warn', !isWarn && !isDanger && 'text-text')}>
          {current}{isUnlimited ? '' : ` / ${limit}`}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-2">
        <div className={cn('h-full rounded-full transition-all', isDanger && 'bg-danger', isWarn && 'bg-warn', !isWarn && !isDanger && 'bg-primary')} style={{ width: `${pct}%`, backgroundColor: (!isWarn && !isDanger) ? color : undefined }} />
      </div>
    </div>
  );
}
