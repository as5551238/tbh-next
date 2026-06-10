import { Lock } from 'lucide-react';
import { hasFeature, PLAN_LIMITS, getCurrentPlan } from '@/lib/subscription';

export default function FeatureFlagsTab() {
  return (
    <div className="space-y-2">
      <div className="text-[10px] text-text-3 mb-2">当前方案: <span className="text-brand-accent font-bold">{getCurrentPlan() === 'free' ? '免费版' : getCurrentPlan() === 'pro' ? '专业版' : '企业版'}</span></div>
      {(
        Object.entries(PLAN_LIMITS.free).filter(([, v]) => typeof v === 'boolean') as [string, boolean][]
      ).map(([key, freeVal]) => {
        const enabled = hasFeature(key as keyof import('@/lib/subscription').PlanLimits);
        return (
          <div key={key} className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-text">{key}</span>
              {freeVal === false && !enabled && <Lock size={11} className="text-text-3" />}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[10px] ${enabled ? 'text-accent' : 'text-text-3'}`}>{enabled ? '已启用' : '未启用'}</span>
              {!enabled && <a href="#/ai/subscription" className="text-[10px] text-brand-accent hover:underline">升级</a>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
