/**
 * UsageAlertsView — 用量预警 + 降级保护 + 团队配额管理
 *
 * Features:
 * - Real-time usage threshold alerts (80%/95%/100%)
 * - Downgrade protection check before plan change
 * - Team quota overview per metric
 * - Quota alert history
 * - DR-51: Alert delivery can be toggled
 */
import { useState, useEffect, useCallback } from 'react';
import { loadUsageAlerts, saveUsageAlerts, checkUsageAndAlert, canDowngrade, type UsageAlert } from '@/lib/automationEngine';
import { getCurrentPlan, PLAN_LIMITS, PLAN_PRICES } from '@/lib/subscription';
import { useAuth } from '@/lib/auth';
import { useMembers, useProjects, useAgentDetails, useKnowledgeDocs } from '@/hooks/useMatrix';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { AlertTriangle, Shield, TrendingUp, Bell, BellOff, CheckCircle2, XCircle, X, ArrowDown, Users, Bot, FileText, FolderKanban } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuotaItem {
  icon: React.ReactNode;
  label: string;
  metric: string;
  current: number;
  limit: number;
  color: string;
}

export default function UsageAlertsView() {
  const { user } = useAuth();
  const { members } = useMembers();
  const { projects } = useProjects();
  const { agents } = useAgentDetails();
  const { docs: knowledgeDocs } = useKnowledgeDocs();

  const [alerts, setAlerts] = useState<UsageAlert[]>(() => loadUsageAlerts());
  const [currentPlan, setCurrentPlan] = useState(() => getCurrentPlan());
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [showDowngrade, setShowDowngrade] = useState(false);
  const [downgradeResult, setDowngradeResult] = useState<{ canDowngrade: boolean; blockers: string[] } | null>(null);
  const [targetPlan, setTargetPlan] = useState('free');

  const plan = PLAN_LIMITS[currentPlan] ?? PLAN_LIMITS.free;

  const quotas: QuotaItem[] = [
    { icon: <Bot size={14} />, label: 'AI查询/日', metric: 'AI查询', current: 12, limit: plan.aiQueriesPerDay, color: 'var(--brand-accent)' },
    { icon: <Users size={14} />, label: '团队成员', metric: '团队成员', current: members.length, limit: plan.maxTeamMembers, color: 'var(--status-success)' },
    { icon: <Bot size={14} />, label: 'Agent', metric: 'Agent', current: agents.length, limit: plan.maxAgents, color: 'var(--color-warn)' },
    { icon: <FolderKanban size={14} />, label: '项目', metric: '项目', current: projects.length, limit: plan.maxProjects, color: 'var(--color-danger)' },
    { icon: <FileText size={14} />, label: '文档', metric: '文档', current: knowledgeDocs.length, limit: plan.maxDocs, color: 'var(--brand-accent)' },
  ];

  // Check usage on mount and generate alerts
  useEffect(() => {
    if (!alertEnabled) return;
    const usageForCheck = quotas.map(q => ({ current: q.current, limit: q.limit, metric: q.metric, plan: currentPlan }));
    const newAlerts = checkUsageAndAlert(usageForCheck);
    if (newAlerts.length > 0) {
      setAlerts(loadUsageAlerts());
    }
  }, [alertEnabled, members.length, projects.length, agents.length, knowledgeDocs.length]);

  const markAsRead = (id: string) => {
    const updated = alerts.map(a => a.id === id ? { ...a, isRead: true } : a);
    saveUsageAlerts(updated);
    setAlerts(updated);
  };

  const dismissAlert = (id: string) => {
    const updated = alerts.filter(a => a.id !== id);
    saveUsageAlerts(updated);
    setAlerts(updated);
  };

  const checkDowngrade = () => {
    const usage = quotas.map(q => ({ metric: q.metric, current: q.current }));
    const result = canDowngrade(currentPlan, targetPlan, usage);
    setDowngradeResult(result);
    setShowDowngrade(true);
  };

  const alertTypeIcon = (type: UsageAlert['type']) => {
    switch (type) {
      case 'threshold_warning': return <AlertTriangle size={14} className="text-warn" />;
      case 'threshold_critical': return <AlertTriangle size={14} className="text-danger" />;
      case 'quota_exceeded': return <XCircle size={14} className="text-danger" />;
      case 'downgrade_blocked': return <Shield size={14} className="text-warn" />;
    }
  };

  const unreadAlerts = alerts.filter(a => !a.isRead);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-3 md:p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <Shield size={18} className="text-primary-2" />
        <span className="text-sm font-bold">用量预警</span>
        {unreadAlerts.length > 0 && (
          <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[9px] font-bold text-danger">{unreadAlerts.length} 未读</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button className="flex items-center gap-1 rounded-lg bg-surface-2 px-3 py-1 text-[11px] text-text-2 hover:bg-surface-2/80" onClick={() => setAlertEnabled(!alertEnabled)}>
            {alertEnabled ? <Bell size={12} /> : <BellOff size={12} />}
            {alertEnabled ? '告警开启' : '告警关闭'}
          </button>
          <button className="flex items-center gap-1 rounded-lg bg-warn/10 px-3 py-1 text-[11px] font-semibold text-warn hover:bg-warn/20" onClick={() => setShowDowngrade(true)}>
            <ArrowDown size={12} />降级检查
          </button>
        </div>
      </div>

      {/* Current Plan Banner */}
      <div className="rounded-xl border border-border p-4" style={{ background: `linear-gradient(135deg, var(--brand-accent) 0%, var(--status-success) 100%)` }}>
        <div className="flex items-center gap-3">
          <TrendingUp size={20} className="text-primary-2" />
          <div>
            <div className="text-sm font-bold text-text">{PLAN_PRICES[currentPlan]?.label || currentPlan}</div>
            <div className="text-[10px] text-text-3">当前方案配额概览</div>
          </div>
        </div>
      </div>

      {/* Quota Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {quotas.map((q) => {
          const isUnlimited = q.limit === -1;
          const pct = isUnlimited ? 30 : Math.min(100, (q.current / q.limit) * 100);
          const isWarn = !isUnlimited && pct >= 80;
          const isDanger = !isUnlimited && pct >= 95;
          return (
            <div key={q.metric} className="rounded-xl border border-border bg-surface p-3">
              <div className="flex items-center gap-1.5 text-xs text-text-2 mb-2">{q.icon}<span>{q.label}</span></div>
              <div className={cn('text-lg font-extrabold', isDanger && 'text-danger', isWarn && 'text-warn', !isWarn && !isDanger && 'text-text')}>
                {q.current}{isUnlimited ? '' : ` / ${q.limit}`}
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-surface-2">
                <div className={cn('h-full rounded-full transition-all', isDanger && 'bg-danger', isWarn && 'bg-warn', !isWarn && !isDanger && 'bg-primary')} style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-1 text-[9px] text-text-3">{isUnlimited ? '无限' : `${pct.toFixed(0)}% 使用`}</div>
            </div>
          );
        })}
      </div>

      {/* Alert List */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={14} className="text-warn" />
          <span className="text-xs font-bold text-text">预警记录</span>
          <span className="text-[9px] text-text-3">({alerts.length}条)</span>
          {unreadAlerts.length > 0 && (
            <button className="ml-auto text-[9px] text-primary-2 hover:underline" onClick={() => { const updated = alerts.map(a => ({ ...a, isRead: true })); saveUsageAlerts(updated); setAlerts(updated); }}>
              全部已读
            </button>
          )}
        </div>
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-text-3 text-xs">暂无预警</div>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {[...alerts].reverse().map((alert) => (
              <div key={alert.id} className={cn('flex items-start gap-2 rounded-lg border px-3 py-2', alert.isRead ? 'border-border/50 opacity-60' : 'border-warn/30 bg-warn/5')}>
                {alertTypeIcon(alert.type)}
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] text-text">{alert.message}</div>
                  <div className="text-[9px] text-text-3">{new Date(alert.createdAt).toLocaleString('zh-CN')}</div>
                </div>
                {!alert.isRead && (
                  <button className="shrink-0 text-[9px] text-primary-2 hover:underline" onClick={() => markAsRead(alert.id)}>已读</button>
                )}
                <button className="shrink-0 text-text-3 hover:text-danger" onClick={() => dismissAlert(alert.id)}><X size={10} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Downgrade Check Modal */}
      <Modal open={showDowngrade} onClose={() => setShowDowngrade(false)} title="降级保护检查"
        footer={<div className="flex flex-wrap gap-2"><button className={btnSecondary} onClick={() => setShowDowngrade(false)}>关闭</button><button className={btnPrimary} onClick={checkDowngrade}>检查降级可行性</button></div>}
      >
        <div className="text-xs text-text-2 mb-3">降级前会检查当前数据量是否超出目标方案配额，超出则需要先清理数据。</div>
        <ModalField label="当前方案">
          <div className={cn(inputCls, 'bg-surface-2')}>{PLAN_PRICES[currentPlan]?.label || currentPlan}</div>
        </ModalField>
        <ModalField label="目标方案">
          <select className={inputCls} value={targetPlan} onChange={(e) => setTargetPlan(e.target.value)}>
            {Object.entries(PLAN_PRICES).filter(([k]) => k !== currentPlan).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </ModalField>
        {downgradeResult && (
          <div className={cn('mt-3 rounded-xl border p-3', downgradeResult.canDowngrade ? 'border-success/30 bg-success/5' : 'border-danger/30 bg-danger/5')}>
            <div className="flex items-center gap-2 mb-1">
              {downgradeResult.canDowngrade ? <CheckCircle2 size={14} className="text-success" /> : <XCircle size={14} className="text-danger" />}
              <span className="text-xs font-bold text-text">{downgradeResult.canDowngrade ? '可以安全降级' : '无法降级'}</span>
            </div>
            {downgradeResult.blockers.length > 0 && (
              <ul className="space-y-1">
                {downgradeResult.blockers.map((b, i) => (
                  <li key={i} className="text-[10px] text-danger">· {b}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
