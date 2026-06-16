import { useState, useCallback, useMemo } from 'react';
import { useMatrixCell, useIndustryColor, useInsights, useTasks, useGoals } from '@/hooks/useMatrix';
import { useToast, ToastOverlay } from '@/hooks/useToast';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, Lightbulb, ArrowUpRight, ArrowDownRight, Plus, Trash2, Lock, RefreshCw, BarChart3 } from 'lucide-react';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { hasFeature } from '@/lib/subscription';
import PaywallModal from '@/components/PaywallModal';
import { useLocale } from '@/lib/i18n';

const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus };

/** Pure SVG horizontal bar chart */
function HBarChart({ data, label, color = 'var(--brand-accent)' }: { data: { label: string; value: number; max?: number }[]; label: string; color?: string }) {
  const maxVal = Math.max(...data.map((d) => d.max ?? d.value), 1);
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center gap-1.5 mb-2"><BarChart3 size={12} className="text-text-3" /><span className="text-[10px] font-bold text-text-3 uppercase tracking-wider">{label}</span></div>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[10px] text-text-2 w-16 shrink-0 truncate text-right">{d.label}</span>
            <div className="flex-1 h-4 rounded-full bg-surface-2 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(d.value / maxVal) * 100}%`, backgroundColor: color, minWidth: d.value > 0 ? '4px' : '0' }} />
            </div>
            <span className="text-[10px] font-semibold text-text w-8 text-right">{d.value}{d.max != null ? `/${d.max}` : ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Pure SVG vertical bar chart for trend data */
function VBarChart({ data, label, color = 'var(--brand-accent)' }: { data: { label: string; value: number }[]; label: string; color?: string }) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barW = Math.max(16, Math.min(32, 280 / data.length - 4));
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center gap-1.5 mb-2"><BarChart3 size={12} className="text-text-3" /><span className="text-[10px] font-bold text-text-3 uppercase tracking-wider">{label}</span></div>
      <svg viewBox={`0 0 ${data.length * (barW + 4) + 8} 100`} className="w-full h-24" preserveAspectRatio="xMidYMid meet">
        {/* Y axis gridlines */}
        {[0, 0.5, 1].map((pct) => (
          <line key={pct} x1="0" y1={100 - pct * 90 - 5} x2="100%" y2={100 - pct * 90 - 5} stroke="var(--color-border, #333)" strokeWidth="0.3" strokeDasharray="2,2" />
        ))}
        {data.map((d, i) => {
          const x = i * (barW + 4) + 4;
          const h = (d.value / maxVal) * 85;
          const y = 95 - h;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={h} rx="2" fill={color} opacity="0.85" />
              <text x={x + barW / 2} y={y - 2} textAnchor="middle" fill="var(--color-text, #eee)" fontSize="6">{d.value}</text>
              <text x={x + barW / 2} y={99} textAnchor="middle" fill="var(--color-text-3, #666)" fontSize="5">{d.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function InsightContent() {
  const { t } = useLocale();
  const { cell, loading } = useMatrixCell();
  const indColor = useIndustryColor();
  const { insights, addInsight, editInsight, removeInsight } = useInsights();
  const modal = useModal();
  const editModal = useModal();
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', impact: 'positive' as 'positive' | 'negative', kpi: '' });
  const [editForm, setEditForm] = useState({ title: '', description: '', impact: 'positive' as string, kpi: '' });
  const [showPaywall, setShowPaywall] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { toasts, success } = useToast();
  const { tasks } = useTasks();
  const { goals } = useGoals();

  // Chart data: task status distribution
  const taskStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tasks) {
      const s = t.status ?? 'todo';
      counts[s] = (counts[s] || 0) + 1;
    }
    return [
      { label: t('insight.statusTodo'), value: counts['todo'] ?? 0 },
      { label: t('insight.statusInProgress'), value: counts['in_progress'] ?? 0 },
      { label: t('insight.statusDone'), value: counts['done'] ?? 0 },
      { label: t('insight.statusCancelled'), value: counts['cancelled'] ?? 0 },
    ];
  }, [tasks]);

  // Chart data: goal progress distribution (buckets)
  const goalProgressData = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0]; // 0-20, 20-40, 40-60, 60-80, 80-100
    for (const g of goals) {
      const p = g.progress ?? 0;
      const idx = Math.min(4, Math.floor(p / 20));
      buckets[idx]++;
    }
    return [
      { label: '0-20%', value: buckets[0] },
      { label: '20-40%', value: buckets[1] },
      { label: '40-60%', value: buckets[2] },
      { label: '60-80%', value: buckets[3] },
      { label: '80-100%', value: buckets[4] },
    ];
  }, [goals]);

  // Chart data: tasks created per status as trend (simplified — uses status counts as proxy)
  const taskTrendData = useMemo(() => taskStatusData.filter((d) => d.value > 0).map((d) => ({ label: d.label, value: d.value })), [taskStatusData]);

  const displayInsights = insights;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const { fetchInsights } = await import('@/lib/dataLayer');
      await fetchInsights();
    } catch { /* no-op */ }
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const handleOpen = useCallback(() => {
    setForm({ title: '', description: '', impact: 'positive', kpi: '' });
    modal.openModal();
  }, [modal]);

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) return;
    await addInsight({ title: form.title, impact: form.impact, kpi: form.kpi, summary: form.description } as Parameters<typeof addInsight>[0]);
    modal.closeModal();
    success(t('insight.insightCreated', { title: form.title }));
  }, [form, addInsight, modal, success]);

  const handleEditOpen = useCallback((insight: typeof displayInsights[0]) => {
    if (insight.id.startsWith('default-')) return;
    setEditId(insight.id);
    setEditForm({ title: insight.title, description: insight.description, impact: insight.impact, kpi: insight.kpi });
    editModal.openModal();
  }, [editModal]);

  const handleEditSave = useCallback(async () => {
    if (!editId || !editForm.title.trim()) return;
    await editInsight(editId, editForm);
    editModal.closeModal();
    success(t('insight.insightUpdated'));
  }, [editId, editForm, editInsight, editModal, success]);

  const handleDelete = useCallback(async (id: string) => {
    await removeInsight(id);
    editModal.closeModal();
    success(t('insight.insightDeleted'));
  }, [removeInsight, editModal, success]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ToastOverlay toasts={toasts} />
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <Lightbulb size={16} className="text-primary-2" />
        <span className="text-sm font-bold">{t('insight.title')}</span>
        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[9px] font-bold text-accent">{t('insight.badge')}</span>
        <button className="ml-auto flex flex-wrap items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20" onClick={handleOpen}>
          <Plus size={12} />{t('insight.newInsight')}
        </button>
      </div>

      <div className="mx-4 mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3 md:p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-primary-2 mb-1"><Lightbulb size={14} />{t('insight.overview')}</div>
        <p className="text-[11px] text-text-2 leading-relaxed">
          {displayInsights.length > 0
            ? t('insight.overviewSummary', { total: displayInsights.length, negative: displayInsights.filter((i) => i.impact === 'negative').length, positive: displayInsights.filter((i) => i.impact === 'positive').length })
            : t('insight.noInsightsYet')}
        </p>
      </div>

      {/* Visual Charts */}
      <div className="mx-4 grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        <HBarChart data={taskStatusData} label={t('insight.chartTaskStatus')} color="var(--brand-accent)" />
        <HBarChart data={goalProgressData} label={t('insight.chartGoalProgress')} color="var(--color-success, #22c55e)" />
        {taskTrendData.length > 0 && <VBarChart data={taskTrendData} label={t('insight.chartTaskOverview')} color="var(--brand-accent)" />}
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">
        {displayInsights.length === 0 ? (
          <div className="text-center py-12">
            <Lightbulb size={32} className="mx-auto text-text-3 mb-3" />
            <p className="text-sm text-text-2 font-semibold">{t('insight.noInsightData')}</p>
            <p className="text-xs text-text-3 mt-1">{t('insight.autoGenerate')}</p>
            <button onClick={handleRefresh} className="mt-3 inline-flex flex-wrap items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary-2 hover:bg-primary/20" disabled={refreshing}>
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />{t('insight.refresh')}
            </button>
          </div>
        ) : (
          <>
          {displayInsights.map((insight) => (
            <div key={insight.id} className="rounded-xl border border-border bg-surface p-3 md:p-4 transition-all hover:shadow-lg cursor-pointer" onClick={() => handleEditOpen(insight)}>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg shrink-0',
                  insight.impact === 'positive' ? 'bg-success/10' : 'bg-danger/10'
                )}>
                  {insight.impact === 'positive' ? <ArrowUpRight size={14} className="text-success" /> : <ArrowDownRight size={14} className="text-danger" />}
                </div>
                <span className="text-sm font-semibold text-text">{insight.title}</span>
                <span className={cn('ml-auto rounded-full px-2 py-0.5 text-[8px] font-bold',
                  insight.impact === 'positive' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                )}>
                  {insight.impact === 'positive' ? t('insight.positive') : t('insight.needsAttention')}
                </span>
              </div>
              <p className="text-xs text-text-2 leading-relaxed mb-2">{insight.description}</p>
              <div className="text-[9px] text-text-3">{t('insight.relatedKpi', { kpi: insight.kpi })}</div>
            </div>
          ))}

        {hasFeature('advancedAnalytics') ? (
          <div className="rounded-xl border border-border bg-surface p-3 md:p-4">
             <div className="text-[10px] font-bold uppercase tracking-wider text-text-3 mb-3">{t('insight.kpiTrendOverview')}</div>
            <div className="grid grid-cols-2 gap-2">
              {cell.kpis.map((kpi) => {
                const TI = TREND_ICON[kpi.trend];
                return (
                  <div key={kpi.name} className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
                    <TI size={13} className={kpi.status === 'good' ? 'text-success' : kpi.status === 'warn' ? 'text-warn' : 'text-danger'} />
                    <div className="min-w-0">
                      <div className="text-[10px] text-text-3 truncate">{kpi.name}</div>
                      <div className={cn('text-xs font-bold', kpi.status === 'good' ? 'text-success' : kpi.status === 'warn' ? 'text-warn' : 'text-danger')}>{kpi.value}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 md:p-4 text-center">
            <Lock size={18} className="mx-auto mb-1 text-primary-2" />
            <p className="text-[11px] text-text-3 mb-2">{t('insight.kpiTrendPaywall')}</p>
            <button
              className="rounded-lg bg-primary px-3 py-1 text-[10px] font-semibold text-white hover:opacity-80"
              onClick={() => setShowPaywall(true)}
            >
              {t('insight.upgradePro')}
            </button>
          </div>
        )}
          </>
        )}
      </div>

      <Modal open={modal.open} onClose={modal.closeModal} title={t('insight.newInsight')}
        footer={
          <div className="flex flex-wrap gap-2">
            <button className={btnSecondary} onClick={modal.closeModal}>{t('common.cancel')}</button>
            <button className={btnPrimary} onClick={handleSave} disabled={!form.title.trim()}>{t('common.create')}</button>
          </div>
        }>
        <ModalField label={t('insight.insightTitle')}>
          <input className={inputCls} placeholder={t('insight.insightTitlePlaceholder')} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
        </ModalField>
        <ModalField label={t('insight.description')}>
          <textarea className={inputCls} rows={3} placeholder={t('insight.descriptionPlaceholder')} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
        </ModalField>
        <ModalField label={t('insight.impact')}>
          <select className={inputCls} value={form.impact} onChange={(e) => setForm((p) => ({ ...p, impact: e.target.value as 'positive' | 'negative' }))}>
            <option value="positive">{t('insight.positive')}</option>
            <option value="negative">{t('insight.needsAttention')}</option>
          </select>
        </ModalField>
        <ModalField label={t('insight.kpiLabel')}>
          <input className={inputCls} placeholder={t('insight.kpiPlaceholder')} value={form.kpi} onChange={(e) => setForm((p) => ({ ...p, kpi: e.target.value }))} />
        </ModalField>
      </Modal>

      <Modal open={editModal.open} onClose={editModal.closeModal} title={t('insight.editInsightTitle')}
        footer={
          <div className="flex flex-wrap gap-2">
            {editId && (
              <button className="flex flex-wrap items-center gap-1 rounded-lg bg-danger/10 px-3 py-1.5 text-[10px] text-danger hover:bg-danger/20 mr-auto" onClick={() => handleDelete(editId)}>
                <Trash2 size={10} />{t('common.delete')}
              </button>
            )}
            <button className={btnSecondary} onClick={editModal.closeModal}>{t('common.cancel')}</button>
            <button className={btnPrimary} onClick={handleEditSave} disabled={!editForm.title.trim()}>{t('common.save')}</button>
          </div>
        }>
        <ModalField label={t('insight.insightTitle')}>
          <input className={inputCls} value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} />
        </ModalField>
        <ModalField label={t('insight.description')}>
          <textarea className={inputCls} rows={3} value={editForm.description} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} />
        </ModalField>
        <ModalField label={t('insight.impact')}>
          <select className={inputCls} value={editForm.impact} onChange={(e) => setEditForm((p) => ({ ...p, impact: e.target.value }))}>
            <option value="positive">{t('insight.positive')}</option>
            <option value="negative">{t('insight.needsAttention')}</option>
          </select>
        </ModalField>
        <ModalField label={t('insight.kpiLabel')}>
          <input className={inputCls} value={editForm.kpi} onChange={(e) => setEditForm((p) => ({ ...p, kpi: e.target.value }))} />
        </ModalField>
      </Modal>

      <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} reason={t('insight.proFeature')} feature="advanced_analytics" />
    </div>
  );
}
