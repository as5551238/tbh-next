/**
 * FeatureFlagsContent — 功能开关管理
 */
import { useState, useMemo } from 'react';
import { useFeatureFlags } from '@/hooks/useMatrix';
import { ToggleLeft, Loader2, Shield, Users, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { setFeatureFlagOverride, FLAG_KEY_TO_FEATURE, type PlanLimits, hasFeature } from '@/lib/subscription';

const PLAN_LABELS: Record<string, string> = { free: '免费版', pro: '专业版', enterprise: '企业版' };

export default function FeatureFlagsContent() {
  const isPro = hasFeature('advancedAnalytics' as never);
  const { flags, loading, toggleFlag } = useFeatureFlags();

  const handleToggle = (id: string, key: string, enabled: boolean) => {
    toggleFlag(id, enabled);
    // Sync admin override to runtime feature gate
    const featureKey = FLAG_KEY_TO_FEATURE[key];
    if (featureKey) {
      setFeatureFlagOverride(featureKey as keyof PlanLimits, enabled);
    }
  };

  const stats = useMemo(() => ({
    total: flags.length,
    enabled: flags.filter((f) => f.enabled).length,
    disabled: flags.filter((f) => !f.enabled).length,
    enterprise: flags.filter((f) => f.target_plan === 'enterprise').length,
  }), [flags]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <ToggleLeft size={18} className="text-primary-2" />
        <span className="text-sm font-bold">功能开关</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '总计', value: stats.total, color: 'text-text' },
          { label: '已开启', value: stats.enabled, color: 'text-success' },
          { label: '已关闭', value: stats.disabled, color: 'text-text-3' },
          { label: '企业专属', value: stats.enterprise, color: 'text-primary-2' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-surface p-3 text-center">
            <div className={cn('text-lg font-extrabold', s.color)}>{s.value}</div>
            <div className="text-[10px] text-text-3">{s.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin text-primary-2" /></div>
      ) : (
        <div className="space-y-2">
          {flags.map((f) => (
            <div key={f.id} className="flex items-center gap-4 rounded-xl border border-border bg-surface px-4 py-3">
              {/* Toggle */}
              <button
                className={cn('relative h-6 w-11 rounded-full transition-colors shrink-0', f.enabled ? 'bg-success' : 'bg-surface-2')}
                onClick={() => { if (!isPro) return; handleToggle(f.id, f.key, !f.enabled); }}
              >
                <div className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', f.enabled ? 'left-[22px]' : 'left-0.5')} />
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-text">{f.name}</span>
                  <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[9px] text-text-3 font-mono">{f.key}</code>
                </div>
                <div className="text-[10px] text-text-3 mt-0.5">{f.description}</div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {/* Rollout */}
                <div className="flex items-center gap-1">
                  <Users size={10} className="text-text-3" />
                  <span className={cn('text-[10px] font-semibold', f.rollout_percentage === 100 ? 'text-success' : f.rollout_percentage > 0 ? 'text-warn' : 'text-text-3')}>
                    {f.rollout_percentage}%
                  </span>
                </div>

                {/* Plan */}
                <div className="flex items-center gap-1">
                  <Shield size={10} className="text-text-3" />
                  <span className="text-[10px] text-text-3">{PLAN_LABELS[f.target_plan] || f.target_plan}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
