import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMatrixCell, useIndustryColor } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, Factory, BarChart3, Target, Edit3, Check, Sparkles, ChevronRight } from 'lucide-react';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { fetchInsights, createInsight, updateInsight } from '@/lib/dataLayer';
import type { InsightRow } from '@/lib/dataLayer';
import { t } from '@/lib/i18n';

const INDUSTRY_KEYS = {
  it: 'IT业',
  mfg: '制造业',
  edu: '教育业',
  fin: '金融业',
} as const;

const INDUSTRY_DISPLAY: Record<string, () => string> = {
  'IT业': () => t('industry.indIt'),
  '制造业': () => t('industry.indMfg'),
  '教育业': () => t('industry.indEdu'),
  '金融业': () => t('industry.indFin'),
};

const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus };

interface PerspectiveValue {
  focus: string;
  trends: string[];
  benchmarks: { label: string; met: boolean }[];
}

type PerspectivesMap = Record<string, PerspectiveValue>;

function getDefaultPerspectives(): PerspectivesMap {
  return {
    [INDUSTRY_KEYS.it]: {
      focus: t('industry.focusIt'),
      trends: [t('industry.trendIt1'), t('industry.trendIt2'), t('industry.trendIt3')],
      benchmarks: [
        { label: t('industry.bmIt1'), met: false },
        { label: t('industry.bmIt2'), met: false },
        { label: t('industry.bmIt3'), met: false },
        { label: t('industry.bmIt4'), met: false },
      ],
    },
    [INDUSTRY_KEYS.mfg]: {
      focus: t('industry.focusMfg'),
      trends: [t('industry.trendMfg1'), t('industry.trendMfg2'), t('industry.trendMfg3')],
      benchmarks: [
        { label: t('industry.bmMfg1'), met: false },
        { label: t('industry.bmMfg2'), met: false },
        { label: t('industry.bmMfg3'), met: false },
      ],
    },
    [INDUSTRY_KEYS.edu]: {
      focus: t('industry.focusEdu'),
      trends: [t('industry.trendEdu1'), t('industry.trendEdu2'), t('industry.trendEdu3')],
      benchmarks: [
        { label: t('industry.bmEdu1'), met: false },
        { label: t('industry.bmEdu2'), met: false },
        { label: t('industry.bmEdu3'), met: false },
      ],
    },
    [INDUSTRY_KEYS.fin]: {
      focus: t('industry.focusFin'),
      trends: [t('industry.trendFin1'), t('industry.trendFin2'), t('industry.trendFin3')],
      benchmarks: [
        { label: t('industry.bmFin1'), met: false },
        { label: t('industry.bmFin2'), met: false },
        { label: t('industry.bmFin3'), met: false },
      ],
    },
  };
}

export default function IndustryView() {
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const navigate = useNavigate();
  const indColor = useIndustryColor();
  const { cell, loading } = useMatrixCell();

  const editModal = useModal();
  const [editField, setEditField] = useState<'focus' | 'trend' | 'benchmark'>('focus');
  const [editIdx, setEditIdx] = useState(0);
  const [editValue, setEditValue] = useState('');

  const [perspectives, setPerspectives] = useState<PerspectivesMap>(getDefaultPerspectives);
  const [insightsLoaded, setInsightsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchInsights().then((rows: InsightRow[]) => {
      if (cancelled) return;
      if (rows.length === 0) { setInsightsLoaded(true); return; }
      const mapped = { ...getDefaultPerspectives() };
      for (const row of rows) {
        const ind = row.kpi || INDUSTRY_KEYS.it;
        if (!mapped[ind]) continue;
        try {
          const payload = JSON.parse(row.description || '{}');
          if (payload.focus) mapped[ind] = { ...mapped[ind], focus: payload.focus };
          if (payload.trends) mapped[ind] = { ...mapped[ind], trends: payload.trends };
          if (payload.benchmarks) mapped[ind] = { ...mapped[ind], benchmarks: payload.benchmarks };
        } catch {}
      }
      setPerspectives(mapped);
      setInsightsLoaded(true);
    }).catch(() => setInsightsLoaded(true));
    return () => { cancelled = true; };
  }, []);

  const persistToSupabase = useCallback(async (next: typeof perspectives, ind: string) => {
    const p = next[ind] ?? next[INDUSTRY_KEYS.it];
    const payload = JSON.stringify({ focus: p.focus, trends: p.trends, benchmarks: p.benchmarks });
    const existing = await fetchInsights();
    const match = existing.find((r) => r.kpi === ind);
    if (match) {
      await updateInsight(match.id, { summary: payload } as Record<string, unknown> as Parameters<typeof updateInsight>[1]);
    } else {
      await createInsight({ title: t('industry.insightTitle', { industry: INDUSTRY_DISPLAY[ind]?.() ?? ind }), type: 'industry_perspective', summary: payload, team_id: '' });
    }
  }, []);

  const perspective = perspectives[industry] ?? perspectives[INDUSTRY_KEYS.it];

  // Auto-check benchmarks against current KPI values
  const checkedBenchmarks = useMemo(() => {
    return perspective.benchmarks.map((bm) => {
      const bmLabel = bm.label;
      const matchingKpi = cell.kpis.find((kpi) => {
        const bmLower = bmLabel.toLowerCase();
        const kpiLower = kpi.name.toLowerCase();
        return bmLower.includes(kpiLower) || kpiLower.includes(bmLower.split(' ')[0]);
      });
      if (matchingKpi) {
        const progress = Number(matchingKpi.target) > 0 ? (Number(matchingKpi.value) / Number(matchingKpi.target)) * 100 : 0;
        return { ...bm, met: progress >= 100 };
      }
      return bm;
    });
  }, [perspective.benchmarks, cell.kpis]);

  const handleEditFocus = () => {
    setEditField('focus');
    setEditValue(perspective.focus);
    editModal.openModal();
  };

  const handleEditTrend = (idx: number) => {
    setEditField('trend');
    setEditIdx(idx);
    setEditValue(perspective.trends[idx]);
    editModal.openModal();
  };

  const handleAddTrend = () => {
    setEditField('trend');
    setEditIdx(-1);
    setEditValue('');
    editModal.openModal();
  };

  const handleToggleBenchmark = (idx: number) => {
    setPerspectives((prev) => {
      const current = prev[industry] ?? prev[INDUSTRY_KEYS.it];
      const newBenchmarks = [...current.benchmarks];
      newBenchmarks[idx] = { ...newBenchmarks[idx], met: !newBenchmarks[idx].met };
      const next = { ...prev, [industry]: { ...current, benchmarks: newBenchmarks } };
      persistToSupabase(next, industry);
      return next;
    });
  };

  const handleEditBenchmark = (idx: number) => {
    setEditField('benchmark');
    setEditIdx(idx);
    setEditValue(perspective.benchmarks[idx].label);
    editModal.openModal();
  };

  const handleAddBenchmark = () => {
    setEditField('benchmark');
    setEditIdx(-1);
    setEditValue('');
    editModal.openModal();
  };

  const handleSave = () => {
    setPerspectives((prev) => {
      const current = prev[industry] ?? prev[INDUSTRY_KEYS.it];
      let next: PerspectivesMap;
      if (editField === 'focus') {
        next = { ...prev, [industry]: { ...current, focus: editValue } };
      } else if (editField === 'trend') {
        const newTrends = [...current.trends];
        if (editIdx === -1) newTrends.push(editValue);
        else newTrends[editIdx] = editValue;
        next = { ...prev, [industry]: { ...current, trends: newTrends } };
      } else {
        const newBm = [...current.benchmarks];
        if (editIdx === -1) newBm.push({ label: editValue, met: false });
        else newBm[editIdx] = { ...newBm[editIdx], label: editValue };
        next = { ...prev, [industry]: { ...current, benchmarks: newBm } };
      }
      persistToSupabase(next, industry);
      return next;
    });
    editModal.closeModal();
  };

  const navigateToKpi = () => {
    navigate(navigateTo('ai', 'risk'));
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <Factory size={16} className="text-primary-2" />
        <span className="text-sm font-bold">{t('industry.title')}</span>
        <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ backgroundColor: indColor + '20', color: indColor }}>{INDUSTRY_DISPLAY[industry]?.() ?? industry}</span>
        <span className="text-[10px] text-text-3">{dept}</span>
        <button className="ml-auto flex flex-wrap items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20" onClick={navigateToKpi}>
          <BarChart3 size={12} />{t('industry.kpiDetail')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
        {/* Focus - Editable */}
        <div className="rounded-xl border border-border p-3 md:p-4 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${indColor}08 0%, ${indColor}03 100%)` }}>
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-10" style={{ backgroundColor: indColor }} />
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Target size={14} style={{ color: indColor }} />
              <span className="text-xs font-bold">{t('industry.coreFocus')}</span>
              <button onClick={handleEditFocus} aria-label={t('industry.editCoreFocus')} className="ml-auto rounded-lg bg-surface-2 p-1 hover:bg-surface-2/80">
                <Edit3 size={10} className="text-text-3" />
              </button>
            </div>
            <p className="text-sm text-text-2">{perspective.focus}</p>
          </div>
        </div>

        {/* KPIs with navigation */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-3">{t('industry.currentKpi')}</span>
            <button onClick={navigateToKpi} className="flex flex-wrap items-center gap-1 text-[10px] text-primary-2 hover:underline">
              {t('industry.viewDetail')} <ChevronRight size={10} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {cell.kpis.slice(0, 6).map((kpi) => {
              const TrendIcon = TREND_ICON[kpi.trend];
              const progress = Number(kpi.target) > 0 ? Math.min(100, Math.round((Number(kpi.value) / Number(kpi.target)) * 100)) : 0;
              return (
                <div key={kpi.name} className="rounded-xl border border-border bg-surface p-3 cursor-pointer hover:border-primary/30 transition-all" onClick={navigateToKpi}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-text-3">{kpi.name}</span>
                    <TrendIcon size={12} className={kpi.status === 'good' ? 'text-success' : kpi.status === 'warn' ? 'text-warn' : 'text-danger'} />
                  </div>
                  <div className={cn('text-lg font-extrabold', kpi.status === 'good' ? 'text-success' : kpi.status === 'warn' ? 'text-warn' : 'text-danger')}>{kpi.value}</div>
                  <div className="text-[9px] text-text-3">{t('industry.targetLabel', { value: kpi.target })}</div>
                  <div className="mt-1 h-1 rounded-full bg-surface-2 overflow-hidden">
                    <div className={cn('h-full rounded-full', kpi.status === 'good' ? 'bg-success' : kpi.status === 'warn' ? 'bg-warn' : 'bg-danger')} style={{ width: `${progress}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trends - Editable + Addable */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-3">{t('industry.industryTrend')}</span>
            <button onClick={handleAddTrend} className="rounded-lg bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary-2 hover:bg-primary/20">+ {t('common.add')}</button>
          </div>
          <div className="space-y-2">
            {perspective.trends.map((trend, i) => (
              <div key={i} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-3 group">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <TrendingUp size={14} className="text-primary-2" />
                </div>
                <span className="text-xs text-text flex-1">{trend}</span>
                <button onClick={() => handleEditTrend(i)} aria-label={t('industry.editTrend')} className="rounded-lg bg-surface-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Edit3 size={10} className="text-text-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Benchmarks - Checkable + Editable */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-3">{t('industry.industryBenchmark')}</span>
            <button onClick={handleAddBenchmark} className="rounded-lg bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary-2 hover:bg-primary/20">+ {t('common.add')}</button>
          </div>
          <div className="space-y-1.5">
            {checkedBenchmarks.map((bm, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-2.5 group">
                <button
                  onClick={() => handleToggleBenchmark(i)}
                  aria-label={t('industry.toggleMet')}
                  className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors',
                    bm.met ? 'bg-success border-success' : 'border-border hover:border-primary/40'
                  )}
                >
                  {bm.met ? <Check size={12} className="text-white" /> : null}
                </button>
                <span className={cn('text-[11px] flex-1', bm.met ? 'text-success line-through' : 'text-text-2')}>{bm.label}</span>
                <button onClick={() => handleEditBenchmark(i)} aria-label={t('industry.editBenchmark')} className="rounded-lg bg-surface-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Edit3 size={10} className="text-text-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* AI Insight */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 md:p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-primary-2 mb-2">
            <Sparkles size={14} />{t('industry.aiInsight')}
          </div>
          <p className="text-[11px] text-text-2 leading-relaxed">
            {t('industry.aiInsightDesc', { industry: INDUSTRY_DISPLAY[industry]?.() ?? industry, dept })}
          </p>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal open={editModal.open} onClose={editModal.closeModal} title={editField === 'focus' ? t('industry.editFocusTitle') : editField === 'trend' ? t('industry.editTrendTitle') : t('industry.editBenchmarkTitle')}
        footer={
          <div className="flex flex-wrap gap-2">
            <button className={btnSecondary} onClick={editModal.closeModal}>{t('common.cancel')}</button>
            <button className={btnPrimary} onClick={handleSave} disabled={!editValue.trim()}>{t('common.save')}</button>
          </div>
        }>
        <ModalField label={editField === 'focus' ? t('industry.focusDesc') : editField === 'trend' ? t('industry.trendDesc') : t('industry.benchmarkDesc')}>
          {editField === 'focus' ? (
            <textarea className={inputCls} rows={3} value={editValue} onChange={(e) => setEditValue(e.target.value)} />
          ) : (
            <input className={inputCls} value={editValue} onChange={(e) => setEditValue(e.target.value)} />
          )}
        </ModalField>
      </Modal>
    </div>
  );
}
