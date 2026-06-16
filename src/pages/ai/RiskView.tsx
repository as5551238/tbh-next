import { useState, useCallback, useEffect, useMemo, lazy, Suspense } from 'react';
import { useToast, ToastOverlay } from '@/hooks/useToast';
import { useRisks, useMatrixCell, useActionItems, useDeviationAlerts } from '@/hooks/useMatrix';
import { useMLOOFeedback } from '@/hooks/useMLOOFeedback';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { AlertTriangle, Clock, TrendingDown, Shield, Plus, Trash2, Zap, Scan, RefreshCw, Settings, Activity, Download } from 'lucide-react';
import { CardSkeleton } from '@/components/Skeleton';
import PaywallModal from '@/components/PaywallModal';
import { scanRisks, alertToDeviationInput, type RiskAlert, type RiskScanResult, type RiskEngineConfig } from '@/lib/riskEngine';
import { recordRender } from '@/lib/monitoring';
import { useGoals, useTasks } from '@/hooks/useMatrix';
import { createDeviationAlert } from '@/lib/dataLayer/crud';
import { exportToCSV, exportToJSON } from '@/lib/export';

/** 4×4 likelihood×impact matrix → score 0-100 */
function computeRiskScore(likelihood: number, impact: number): number {
  const matrix = [
    [5, 10, 20, 40],   // likelihood: 1 (rare)
    [10, 20, 40, 60],   // likelihood: 2 (unlikely)
    [20, 40, 60, 80],   // likelihood: 3 (possible)
    [40, 60, 80, 100],  // likelihood: 4 (likely)
  ];
  const l = Math.max(1, Math.min(4, likelihood)) - 1;
  const i = Math.max(1, Math.min(4, impact)) - 1;
  return matrix[l][i];
}

const RiskEngineDashboard = lazy(() => import('@/components/RiskEngineDashboard'));

const LEVEL_STYLES: Record<string, string> = {
  critical: 'bg-danger/10 text-danger border-l-danger',
  high: 'bg-warn/10 text-warn border-l-warn',
  medium: 'bg-primary/10 text-primary-2 border-l-primary',
  low: 'bg-surface-2 text-text-3 border-l-border',
};

const LEVEL_DOT: Record<string, string> = { critical: 'bg-danger', high: 'bg-warn', medium: 'bg-primary-2', low: 'bg-text-3' };

const SEVERITY_STYLE: Record<string, string> = {
  critical: 'bg-danger/10 text-danger border-l-danger',
  warning: 'bg-warn/10 text-warn border-l-warn',
  info: 'bg-primary/10 text-primary-2 border-l-primary',
};

const SEVERITY_DOT: Record<string, string> = { critical: 'bg-danger', warning: 'bg-warn', info: 'bg-primary-2' };

const SEVERITY_LABEL: Record<string, string> = { critical: '紧急', warning: '警告', info: '提示' };

const SOURCE_LABEL: Record<string, string> = {
  task_overdue: '任务逾期',
  task_stalled: '任务停滞',
  goal_at_risk: '目标风险',
  goal_overdue: '目标逾期',
  action_item_overdue: '行动项逾期',
  milestone_overdue: '里程碑逾期',
};

export default function RiskView() {
  const [showPaywall, setShowPaywall] = useState(false);
  const { risks, loading, addRisk, editRisk, removeRisk } = useRisks();
  const { cell } = useMatrixCell();

  // ── Monitor: render timing ─────────────────────────────────────────
  const _mountT0 = useMemo(() => performance.now(), []);
  useEffect(() => { return () => { recordRender('RiskView', performance.now() - _mountT0); }; }, [_mountT0]);
  const { actionItems, addActionItem } = useActionItems();
  const { alerts: deviationAlerts } = useDeviationAlerts();
  const { goals } = useGoals();
  const { tasks } = useTasks();
  const { triggerFeedback } = useMLOOFeedback();
  const industry = useAppStore((s) => s.industry);
  const addModal = useModal();
  const detailModal = useModal();
  const configModal = useModal();
  const { toasts, success, error: toastError } = useToast();
  const [selectedRisk, setSelectedRisk] = useState<typeof risks[number] | null>(null);
  const [form, setForm] = useState({ title: '', level: 'medium' as 'critical' | 'high' | 'medium' | 'low', description: '', source: '', affected_kpi: '', status: 'active' as 'active' | 'watching' | 'resolved', likelihood: 2, impact: 2 });

  // ── Proactive risk scanning state ──
  const [scanResult, setScanResult] = useState<RiskScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [autoScanEnabled, setAutoScanEnabled] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<RiskAlert | null>(null);
  const [alertDetailOpen, setAlertDetailOpen] = useState(false);
  const [riskTab, setRiskTab] = useState<'list' | 'engine'>('list');
  const [engineConfig, setEngineConfig] = useState<RiskEngineConfig>({
    autoScan: true,
    overdueCriticalDays: 3,
    overdueWarningDays: 1,
    stalledDays: 7,
    goalAtRiskProgress: 30,
    goalAtRiskDaysBeforeEnd: 7,
  });
  const [riskExportOpen, setRiskExportOpen] = useState(false);

  // ── Auto-scan on mount (DR-51: toggle-gated) ──
  useEffect(() => {
    if (!autoScanEnabled || tasks.length === 0) return;
    const result = scanRisks(tasks, goals, actionItems, deviationAlerts, engineConfig);
    setScanResult(result);
  }, [tasks, goals, actionItems, deviationAlerts, autoScanEnabled]);

  // ── Manual scan trigger ──
  const handleManualScan = useCallback(async () => {
    setScanning(true);
    try {
      const result = scanRisks(tasks, goals, actionItems, deviationAlerts, engineConfig);
      setScanResult(result);
      // Persist new alerts to deviation_alerts (DR-53: data drives action)
      let persisted = 0;
      for (const alert of result.alerts.slice(0, 10)) {
        try {
          await createDeviationAlert(alertToDeviationInput(alert));
          persisted++;
        } catch { /* non-blocking — alert still shown in UI */ }
      }
      // P2-3: Show toast notification for critical/warning alerts
      if (result.alerts.length > 0) {
        const criticals = result.alerts.filter((a: RiskAlert) => a.severity === 'critical').length;
        const warnings = result.alerts.filter((a: RiskAlert) => a.severity === 'warning').length;
        if (criticals > 0) {
          toastError(`发现 ${criticals} 个紧急风险！请立即处理`);
        } else if (warnings > 0) {
          success(`风险扫描完成：${warnings} 个警告，${persisted} 条已入库`);
        } else {
          success(`风险扫描完成：${result.alerts.length} 条提示`);
        }
      } else {
        success('风险扫描完成：未发现新风险');
      }
    } finally {
      setScanning(false);
    }
  }, [tasks, goals, actionItems, deviationAlerts, engineConfig, success, toastError]);

  // ── Generate action item from auto-detected alert ──
  const handleAlertToAction = useCallback((alert: RiskAlert) => {
    addActionItem({
      title: alert.title,
      description: alert.description,
      source: 'deviation',
      source_id: alert.id,
      goal_id: alert.goalId ?? null,
      assignee_id: null,
      priority: alert.severity === 'critical' ? 'critical' : alert.severity === 'warning' ? 'high' : 'medium',
      status: 'open',
      closed_loop: false,
    });
    setAlertDetailOpen(false);
  }, [addActionItem]);

  const activeRisks = risks.filter((r) => r.status !== 'resolved');
  const criticalCount = risks.filter((r) => r.level === 'critical' && r.status === 'active').length;

  if (loading) {
    return <CardSkeleton />;
  }

  const autoAlertCount = scanResult?.summary.total ?? 0;
  const autoCriticalCount = scanResult?.summary.critical ?? 0;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ToastOverlay toasts={toasts} />
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <Shield size={16} className="text-primary-2" />
        <span className="text-sm font-bold">风险预警</span>
        {criticalCount > 0 && <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-bold text-danger">{criticalCount} 手动紧急</span>}
        {autoCriticalCount > 0 && <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-bold text-danger">{autoCriticalCount} 自动检测</span>}
        <span className="text-[10px] text-text-3">{activeRisks.length} 手动 / {autoAlertCount} 自动</span>

        {/* Proactive scan controls */}
        <button className={cn('flex items-center gap-1 rounded-lg px-3 py-1 text-[11px] font-semibold hover:opacity-80', scanning ? 'bg-surface-2 text-text-3' : 'bg-accent/10 text-accent')} onClick={handleManualScan} disabled={scanning}>
          {scanning ? <RefreshCw size={12} className="animate-spin" /> : <Scan size={12} />}
          {scanning ? '扫描中...' : '主动扫描'}
        </button>
        <button className="flex items-center gap-1 rounded-lg bg-surface-2 px-3 py-1 text-[11px] font-semibold text-text-3 hover:text-text" onClick={() => setAutoScanEnabled((v) => !v)}>
          <Settings size={12} />
          {autoScanEnabled ? '自动:开' : '自动:关'}
        </button>

        <button className="ml-auto flex flex-wrap items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20" onClick={() => { setForm({ title: '', level: 'medium', description: '', source: '', affected_kpi: '', status: 'active', likelihood: 2, impact: 2 }); addModal.openModal(); }}>
          <Plus size={12} />上报风险
        </button>
        <div className="relative">
          <button className="flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-text-3 hover:text-text-2" onClick={() => setRiskExportOpen((v) => !v)}><Download size={10} />导出 ▾</button>
          {riskExportOpen && (<>
            <div className="fixed inset-0 z-40" onClick={() => setRiskExportOpen(false)} />
            <div className="absolute right-0 top-full z-50 mt-1 min-w-[100px] rounded-lg border border-border bg-surface py-1 shadow-lg">
              <button className="w-full px-3 py-1.5 text-left text-xs text-text-3 hover:bg-surface-2 hover:text-text-2" onClick={() => { setRiskExportOpen(false); exportToCSV(['标题', '级别', '描述', '来源', '影响KPI', '状态', '检测日期'], risks.map((r) => ({ '标题': r.title, '级别': r.level, '描述': r.description, '来源': r.source, '影响KPI': r.affected_kpi ?? '', '状态': r.status, '检测日期': r.detected_at })), 'risks'); }}>导出 CSV</button>
              <button className="w-full px-3 py-1.5 text-left text-xs text-text-3 hover:bg-surface-2 hover:text-text-2" onClick={() => { setRiskExportOpen(false); exportToJSON(risks.map((r) => ({ title: r.title, level: r.level, description: r.description, source: r.source, status: r.status })), 'risks'); }}>导出 JSON</button>
            </div>
          </>)}
        </div>
      </div>

      {/* ── Tab: 风险列表 / 引擎仪表盘 ── */}
      <div className="flex items-center gap-1 px-3 md:px-4 pt-2 pb-1">
        {([
          { key: 'list' as const, label: '风险列表', icon: AlertTriangle },
          { key: 'engine' as const, label: '引擎仪表盘', icon: Activity },
        ]).map(t => (
          <button key={t.key} onClick={() => setRiskTab(t.key)}
            className={cn('flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors', riskTab === t.key ? 'bg-primary/10 text-primary-2' : 'text-text-3 hover:bg-surface-2')}>
            <t.icon size={12} />{t.label}
          </button>
        ))}
      </div>

      {/* ── Engine Dashboard Tab ── */}
      {riskTab === 'engine' && (
        <div className="flex-1 overflow-y-auto p-3 md:p-4">
          <Suspense fallback={<CardSkeleton />}>
            <RiskEngineDashboard />
          </Suspense>
        </div>
      )}

      {/* ── Risk List Tab ── */}
      {riskTab === 'engine' ? null : (<>

      {/* ── Auto-detected alerts section ── */}
      {scanResult && scanResult.alerts.length > 0 && (
        <div className="border-b border-border">
          <div className="flex items-center gap-2 px-4 py-2 bg-warn/5">
            <Scan size={14} className="text-warn" />
            <span className="text-xs font-semibold text-warn">主动检测 ({scanResult.summary.total})</span>
            <span className="text-[10px] text-text-3 ml-2">紧急 {scanResult.summary.critical} / 警告 {scanResult.summary.warning} / 提示 {scanResult.summary.info}</span>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {scanResult.alerts.map((alert) => (
              <div key={alert.id} onClick={() => { setSelectedAlert(alert); setAlertDetailOpen(true); }} className={cn('flex items-center gap-3 px-4 py-2.5 border-b border-border/50 cursor-pointer hover:bg-surface-2 transition-colors', SEVERITY_STYLE[alert.severity])} style={{ borderLeftWidth: 3 }}>
                <div className={cn('h-2 w-2 rounded-full shrink-0', SEVERITY_DOT[alert.severity])} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-text truncate">{alert.title}</span>
                    <span className={cn('rounded-full px-1.5 py-0.5 text-[8px] font-bold shrink-0', SEVERITY_STYLE[alert.severity].split(' ').slice(0, 2).join(' '))}>
                      {SEVERITY_LABEL[alert.severity]}
                    </span>
                    <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[8px] text-text-3">{SOURCE_LABEL[alert.source] ?? alert.source}</span>
                  </div>
                  <p className="text-[10px] text-text-3 truncate mt-0.5">{alert.description}</p>
                </div>
                <span className="text-[9px] text-text-3 shrink-0">评分: {alert.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AI Summary — generated from actual risk data ── */}
      <div className="mx-4 mt-3 rounded-xl border border-warn/20 bg-warn/5 p-3 md:p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-warn mb-1">
          <AlertTriangle size={14} />风险概览
        </div>
        <p className="text-[11px] text-text-2 leading-relaxed">
          {activeRisks.length === 0 && autoAlertCount === 0
            ? '暂无活跃风险。'
            : autoCriticalCount > 0
              ? `自动检测发现 ${autoCriticalCount} 个紧急风险，${activeRisks.length} 个手动录入风险。建议立即处理自动检测到的紧急项。`
              : criticalCount > 0
                ? `当前有 ${criticalCount} 个紧急风险需立即处理，${activeRisks.length} 个活跃风险待关注。`
                : `当前共 ${activeRisks.length} 个手动 + ${autoAlertCount} 个自动检测风险，建议持续监控。`}
        </p>
      </div>

      {/* ── Manually reported risks ── */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2">
        <div className="text-[10px] font-semibold text-text-3 mb-1">手动上报 ({risks.length})</div>
        {risks.map((risk) => (
          <div key={risk.id} onClick={() => { setSelectedRisk(risk); detailModal.openModal(); }} className={cn('rounded-xl border border-border border-l-2 bg-surface p-4 transition-all hover:shadow-lg cursor-pointer', LEVEL_STYLES[risk.level].split(' ').pop(),
            risk.status === 'resolved' && 'opacity-40'
          )}>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <div className={cn('h-2 w-2 rounded-full shrink-0', LEVEL_DOT[risk.level])} />
              <span className="text-sm font-semibold text-text">{risk.title}</span>
              <span className={cn('ml-auto rounded-full px-2 py-0.5 text-[8px] font-bold shrink-0', LEVEL_STYLES[risk.level].split(' ').slice(0, 2).join(' '))}>
                {risk.level === 'critical' ? '紧急' : risk.level === 'high' ? '高' : risk.level === 'medium' ? '中' : '低'}
              </span>
            </div>
            <p className="text-xs text-text-2 mb-2 leading-relaxed">{risk.description}</p>
            <div className="flex flex-wrap items-center gap-3 text-[10px] text-text-3">
              <span>来源: {risk.source}</span>
              <span className="flex flex-wrap items-center gap-1"><Clock size={9} />{risk.detected_at}</span>
              {risk.affected_kpi && <span className="flex flex-wrap items-center gap-1"><TrendingDown size={9} />影响: {risk.affected_kpi}</span>}
              <span className={cn('ml-auto', risk.status === 'active' ? 'text-danger' : risk.status === 'watching' ? 'text-warn' : 'text-success')}>
                {risk.status === 'active' ? '活跃' : risk.status === 'watching' ? '观察中' : '已解决'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Alert Detail Modal ── */}
      <Modal open={alertDetailOpen} onClose={() => setAlertDetailOpen(false)} title="风险预警详情"
        footer={
          selectedAlert ? (
            <div className="flex flex-wrap gap-2">
              <button className={btnSecondary} onClick={() => setAlertDetailOpen(false)}>关闭</button>
              <button className="flex items-center gap-1 rounded-lg bg-accent/10 px-3 py-1.5 text-[11px] font-semibold text-accent hover:bg-accent/20" onClick={() => handleAlertToAction(selectedAlert)}>
                <Zap size={10} />生成行动项
              </button>
            </div>
          ) : undefined
        }>
        {selectedAlert && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={cn('h-2 w-2 rounded-full', SEVERITY_DOT[selectedAlert.severity])} />
              <span className="text-sm font-semibold text-text">{selectedAlert.title}</span>
              <span className={cn('ml-auto rounded-full px-2 py-0.5 text-[8px] font-bold', SEVERITY_STYLE[selectedAlert.severity].split(' ').slice(0, 2).join(' '))}>
                {SEVERITY_LABEL[selectedAlert.severity]}
              </span>
            </div>
            <p className="text-xs text-text-2 leading-relaxed">{selectedAlert.description}</p>
            <div className="flex flex-wrap gap-3 text-[10px] text-text-3">
              <span>来源: {SOURCE_LABEL[selectedAlert.source] ?? selectedAlert.source}</span>
              <span>风险评分: {selectedAlert.score}/100</span>
              {selectedAlert.taskId && <span>关联任务</span>}
              {selectedAlert.goalId && <span>关联目标</span>}
            </div>
          </div>
        )}
      </Modal>

      {/* ── Create Risk Modal ── */}
      <Modal open={addModal.open} onClose={addModal.closeModal} title="上报风险"
        footer={
          <div className="flex flex-wrap gap-2">
            <button className={btnSecondary} onClick={addModal.closeModal}>取消</button>
            <button className={btnPrimary} onClick={() => { if (!form.title.trim()) return; addRisk({ title: form.title, level: form.level, description: form.description, source: form.source || '手动上报', affected_kpi: form.affected_kpi || null, status: form.status, detected_at: new Date().toISOString().split('T')[0], likelihood: form.likelihood, impact: form.impact, score: computeRiskScore(form.likelihood, form.impact), severity: form.level }).then((risk) => { triggerFeedback({ type: 'risk_created', action: 'created', entity: risk as unknown as Record<string, unknown> }); }).catch((err) => { console.error('[risk]', err); }); addModal.closeModal(); }} disabled={!form.title.trim()}>创建</button>
          </div>
        }>
        <ModalField label="风险标题">
          <input className={inputCls} placeholder="输入风险标题" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
        </ModalField>
        <ModalField label="风险级别">
          <select className={inputCls} value={form.level} onChange={(e) => setForm((p) => ({ ...p, level: e.target.value as typeof form.level }))}>
            <option value="critical">紧急</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </ModalField>
        <ModalField label="描述">
          <textarea className={inputCls} rows={3} placeholder="描述风险详情" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
        </ModalField>
        <ModalField label="来源">
          <input className={inputCls} placeholder="如：目标偏差、外部变更" value={form.source} onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))} />
        </ModalField>
        <ModalField label="影响KPI（可选）">
          <input className={inputCls} placeholder="如：交付及时率" value={form.affected_kpi} onChange={(e) => setForm((p) => ({ ...p, affected_kpi: e.target.value }))} />
        </ModalField>
        <div className="mb-3">
          <div className="text-[11px] font-medium text-text-3 mb-1">风险评估</div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-[10px] text-text-3">可能性 ({form.likelihood}/4)</label>
              <input type="range" min="1" max="4" value={form.likelihood} className="w-full accent-primary" onChange={(e) => setForm((p) => ({ ...p, likelihood: Number(e.target.value) }))} />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-text-3">影响度 ({form.impact}/4)</label>
              <input type="range" min="1" max="4" value={form.impact} className="w-full accent-warn" onChange={(e) => setForm((p) => ({ ...p, impact: Number(e.target.value) }))} />
            </div>
          </div>
          <div className={cn('mt-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-center', computeRiskScore(form.likelihood, form.impact) >= 60 ? 'bg-danger/10 text-danger' : computeRiskScore(form.likelihood, form.impact) >= 40 ? 'bg-warn/10 text-warn' : 'bg-success/10 text-success')}>
            风险评分: {computeRiskScore(form.likelihood, form.impact)}/100
          </div>
        </div>
      </Modal>

      {/* ── Risk Detail / Edit / Delete Modal ── */}
      <Modal open={detailModal.open} onClose={detailModal.closeModal} title="风险详情"
        footer={
          selectedRisk ? (
            <>
              <button className="mr-auto rounded-lg px-3 py-1.5 text-[11px] font-semibold text-danger hover:bg-danger/10" onClick={() => { removeRisk(selectedRisk.id); detailModal.closeModal(); }}>删除</button>
              <button className={btnSecondary} onClick={detailModal.closeModal}>关闭</button>
              {selectedRisk.status !== 'resolved' && (
                <button className={btnPrimary} onClick={() => { editRisk(selectedRisk.id, { status: 'resolved' }); detailModal.closeModal(); }}>标记已解决</button>
              )}
              {selectedRisk.status !== 'resolved' && (
                <button className="flex flex-wrap items-center gap-1 rounded-lg bg-accent/10 px-3 py-1.5 text-[11px] font-semibold text-accent hover:bg-accent/20" onClick={() => { addActionItem({ title: `风险应对: ${selectedRisk.title}`, description: selectedRisk.description, source: 'deviation', source_id: selectedRisk.id, goal_id: selectedRisk.affected_kpi, priority: selectedRisk.level === 'critical' ? 'critical' : selectedRisk.level === 'high' ? 'high' : 'medium', status: 'open', closed_loop: false } as Parameters<typeof addActionItem>[0]); detailModal.closeModal(); }}><Zap size={10} />生成行动项</button>
              )}
            </>
          ) : undefined
        }>
        {selectedRisk && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className={cn('h-2 w-2 rounded-full', LEVEL_DOT[selectedRisk.level])} />
              <span className="text-sm font-semibold text-text">{selectedRisk.title}</span>
              <span className={cn('ml-auto rounded-full px-2 py-0.5 text-[8px] font-bold', LEVEL_STYLES[selectedRisk.level].split(' ').slice(0, 2).join(' '))}>
                {selectedRisk.level === 'critical' ? '紧急' : selectedRisk.level === 'high' ? '高' : selectedRisk.level === 'medium' ? '中' : '低'}
              </span>
            </div>
            <p className="text-xs text-text-2 leading-relaxed">{selectedRisk.description}</p>
            <div className="flex flex-wrap gap-3 text-[10px] text-text-3">
              <span>来源: {selectedRisk.source}</span>
              <span className="flex flex-wrap items-center gap-1"><Clock size={9} />{selectedRisk.detected_at}</span>
              {selectedRisk.affected_kpi && <span><TrendingDown size={9} className="inline" /> 影响: {selectedRisk.affected_kpi}</span>}
            </div>
            <div className={cn('rounded-lg px-3 py-2 text-xs font-medium', selectedRisk.status === 'active' ? 'bg-danger/10 text-danger' : selectedRisk.status === 'watching' ? 'bg-warn/10 text-warn' : 'bg-success/10 text-success')}>
              {selectedRisk.status === 'active' ? '活跃' : selectedRisk.status === 'watching' ? '观察中' : '已解决'}
            </div>
          </div>
        )}
      </Modal>

      <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} reason="风险分析需要专业版或企业版" feature="ai_risk_analysis" />
      </>)} {/* end risk list tab */}
    </div>
  );
}
