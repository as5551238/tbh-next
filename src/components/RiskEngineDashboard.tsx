/**
 * RiskEngineDashboard — 3-tab risk engine dashboard.
 *
 * Tabs: 告警 (L1 alerts) | 预测 (L2 trajectories) | 升级 (L3 escalations)
 * Reads data from riskEngine + escalationEngine + localStorage.
 */

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  AlertTriangle, Activity, ArrowUpRight, ArrowRight, ArrowDownRight,
  Minus, Shield, TrendingUp, ChevronRight,
} from 'lucide-react';
import type { RiskAlert, RiskTrajectory } from '@/lib/riskEngine';
import { predictRiskTrajectories } from '@/lib/riskEngine';
import {
  checkEscalations, computeRiskPortfolio, DEFAULT_POLICIES,
  type EscalationAction, type RiskPortfolioSummary,
} from '@/lib/escalationEngine';
import { useTasks, useGoals, useActionItems, useDeviationAlerts } from '@/hooks/useMatrix';
import { scanRisks } from '@/lib/riskEngine';

type Tab = 'alerts' | 'predict' | 'escalate';

const TABS: { key: Tab; label: string; icon: typeof AlertTriangle }[] = [
  { key: 'alerts', label: '告警', icon: AlertTriangle },
  { key: 'predict', label: '预测', icon: TrendingUp },
  { key: 'escalate', label: '升级', icon: Shield },
];

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'text-danger',
  warning: 'text-warn',
  info: 'text-primary-2',
};

const SEVERITY_BG: Record<string, string> = {
  critical: 'bg-danger/10',
  warning: 'bg-warn/10',
  info: 'bg-primary/10',
};

const LEVEL_LABEL: Record<string, string> = {
  L1_team: '团队',
  L2_manager: '管理者',
  L3_executive: '高管',
};

const LEVEL_COLOR: Record<string, string> = {
  L1_team: 'text-primary-2',
  L2_manager: 'text-warn',
  L3_executive: 'text-danger',
};

const TREND_ICON = {
  improving: <ArrowDownRight size={12} className="text-success" />,
  stable: <Minus size={12} className="text-text-3" />,
  deteriorating: <ArrowUpRight size={12} className="text-danger" />,
};

export default function RiskEngineDashboard() {
  const [tab, setTab] = useState<Tab>('alerts');
  const { tasks } = useTasks();
  const { goals } = useGoals();
  const { actionItems } = useActionItems();
  const { alerts: deviationAlerts } = useDeviationAlerts();

  const scanResult = useMemo(
    () => scanRisks(tasks, goals, actionItems, deviationAlerts, { autoScan: true }),
    [tasks, goals, actionItems, deviationAlerts],
  );

  const trajectories = useMemo(
    () => predictRiskTrajectories(scanResult.alerts),
    [scanResult.alerts],
  );

  const escalations = useMemo(
    () => checkEscalations(scanResult.alerts, DEFAULT_POLICIES),
    [scanResult.alerts],
  );

  const portfolio = useMemo(
    () => computeRiskPortfolio(scanResult.alerts),
    [scanResult.alerts],
  );

  return (
    <div className="space-y-3">
      {/* Portfolio Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <MetricCard label="总告警" value={String(portfolio.totalAlerts)} color="text-text" />
        <MetricCard label="紧急" value={String(portfolio.criticalCount)} color="text-danger" />
        <MetricCard label="警告" value={String(portfolio.warningCount)} color="text-warn" />
        <MetricCard label="平均评分" value={String(portfolio.avgScore)} color="text-primary-2" />
        <MetricCard label="待升级" value={String(portfolio.escalationReady)} color="text-accent" />
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 border-b border-border pb-1">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors',
              tab === t.key ? 'bg-primary/10 text-primary-2' : 'text-text-3 hover:bg-surface-2',
            )}>
            <t.icon size={12} />{t.label}
            {t.key === 'alerts' && portfolio.totalAlerts > 0 && (
              <span className="ml-0.5 rounded-full bg-danger px-1 py-px text-[8px] font-bold text-white">
                {portfolio.totalAlerts}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'alerts' && <AlertsTab alerts={scanResult.alerts} />}
      {tab === 'predict' && <PredictTab trajectories={trajectories} />}
      {tab === 'escalate' && <EscalateTab actions={escalations} portfolio={portfolio} />}
    </div>
  );
}

// ─── Sub-components ───

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-2 text-center">
      <div className={cn('text-lg font-bold', color)}>{value}</div>
      <div className="text-[9px] text-text-3">{label}</div>
    </div>
  );
}

function AlertsTab({ alerts }: { alerts: RiskAlert[] }) {
  if (alerts.length === 0) {
    return <div className="py-8 text-center text-xs text-text-3">暂无告警</div>;
  }
  return (
    <div className="space-y-1.5 max-h-96 overflow-y-auto">
      {alerts.map(a => (
        <div key={a.id} className={cn('flex items-center gap-2 rounded-lg border border-border p-2', SEVERITY_BG[a.severity])}>
          <div className={cn('h-2 w-2 rounded-full shrink-0', a.severity === 'critical' ? 'bg-danger' : a.severity === 'warning' ? 'bg-warn' : 'bg-primary-2')} />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-text truncate">{a.title}</div>
            <div className="text-[9px] text-text-3 truncate">{a.description}</div>
          </div>
          <div className="shrink-0 text-right">
            <div className={cn('text-xs font-bold', SEVERITY_COLOR[a.severity])}>{a.score}</div>
            <div className="text-[8px] text-text-3">{a.source}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PredictTab({ trajectories }: { trajectories: RiskTrajectory[] }) {
  if (trajectories.length === 0) {
    return <div className="py-8 text-center text-xs text-text-3">暂无预测数据</div>;
  }
  return (
    <div className="space-y-1.5 max-h-96 overflow-y-auto">
      {trajectories.map(t => (
        <div key={t.alertId} className="rounded-lg border border-border p-2">
          <div className="flex items-center gap-2 mb-1">
            {TREND_ICON[t.trend]}
            <span className={cn(
              'text-[10px] font-bold',
              t.trend === 'deteriorating' ? 'text-danger' : t.trend === 'improving' ? 'text-success' : 'text-text-3',
            )}>
              {t.trend === 'deteriorating' ? '恶化中' : t.trend === 'improving' ? '改善中' : '稳定'}
            </span>
            <span className="text-[10px] text-text-3 ml-auto">
              当前 {t.currentScore} → 预测 {t.predictedScore}
            </span>
          </div>
          <p className="text-[10px] text-text-2 leading-relaxed">{t.reason}</p>
          {t.daysToCritical !== null && (
            <div className="mt-1 flex items-center gap-1 text-[9px] text-danger">
              <ChevronRight size={10} />
              预计 {t.daysToCritical} 天后达到严重级别
            </div>
          )}
          <div className="mt-1 text-[8px] text-text-3">
            置信度: {Math.round(t.confidence * 100)}%
          </div>
        </div>
      ))}
    </div>
  );
}

function EscalateTab({ actions, portfolio }: { actions: EscalationAction[]; portfolio: RiskPortfolioSummary }) {
  if (actions.length === 0) {
    return (
      <div className="py-8 text-center">
        <div className="text-xs text-text-3">暂无需升级的风险</div>
        {portfolio.totalAlerts > 0 && (
          <div className="text-[10px] text-text-3 mt-1">
            {portfolio.totalAlerts} 个告警均未达到升级阈值
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {/* Policy list */}
      <div className="text-[10px] font-semibold text-text-3 mb-1">升级策略 ({DEFAULT_POLICIES.length})</div>
      <div className="space-y-1">
        {DEFAULT_POLICIES.map(p => (
          <div key={p.id} className="flex items-center gap-2 rounded-lg bg-surface border border-border p-2">
            <Shield size={12} className={LEVEL_COLOR[p.level]} />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold text-text">{p.name}</div>
              <div className="text-[8px] text-text-3">{p.description}</div>
            </div>
            <span className={cn('text-[8px] font-bold', LEVEL_COLOR[p.level])}>
              {LEVEL_LABEL[p.level]}
            </span>
          </div>
        ))}
      </div>

      {/* Triggered actions */}
      <div className="text-[10px] font-semibold text-text-3 mt-3 mb-1">
        待执行升级 ({actions.length})
      </div>
      <div className="space-y-1.5 max-h-60 overflow-y-auto">
        {actions.map(a => (
          <div key={a.alertId + a.level} className="rounded-lg border border-warn/30 bg-warn/5 p-2">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('text-[10px] font-bold', SEVERITY_COLOR[a.severity])}>
                {a.score}分
              </span>
              <span className={cn('rounded-full px-1.5 py-px text-[8px] font-bold', LEVEL_COLOR[a.level])}>
                {LEVEL_LABEL[a.level]}
              </span>
              <span className="text-[8px] text-text-3 ml-auto">{a.policyName}</span>
            </div>
            <div className="text-[10px] text-text">{a.alertTitle}</div>
            <div className="text-[9px] text-text-2 mt-0.5">{a.action}</div>
          </div>
        ))}
      </div>
    </div>
  );
}