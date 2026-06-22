import { useGateCheck } from '@/hooks/useGateCheck';
import PaywallModal from '@/components/PaywallModal';
import { useState, useCallback, useEffect } from 'react';
import { usePredictions, useMatrixCell, useIndustryColor } from '@/hooks/useMatrix';
import { useToast, ToastOverlay } from '@/hooks/useToast';
import { Brain, TrendingUp, AlertTriangle, Sparkles, ArrowUpRight, Plus, Loader2 } from 'lucide-react';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import ItemDetailModal from '@/components/ItemDetailModal';
import { CardSkeleton } from '@/components/Skeleton';
import { chatCompletion, type ChatMessage } from '@/lib/aiService';
import { t } from '@/lib/i18n';

export default function PredictionContent() {
  const { showPaywall: pdShow, paywallReason: pdReason, paywallFeature: pdFeat, closePaywall: pdClose, requireFeature: pdRequire } = useGateCheck();
  const { cell, loading: cellLoading } = useMatrixCell();
  const indColor = useIndustryColor();
  const { predictions, addPrediction, editPrediction, removePrediction, loading } = usePredictions();
  const modal = useModal();
  const editModal = useModal();
  const [selectedPred, setSelectedPred] = useState<(typeof predictions)[number] | null>(null);
  const [form, setForm] = useState({ title: '', impact: 'medium' as 'positive' | 'high' | 'medium', probability: 50, reason: '', suggestion: '' });
  const [aiLoading, setAiLoading] = useState(false);
  const { toasts, success } = useToast();
  const PRED_STORAGE = 'tbh-predictions';

  useEffect(() => {
    if (loading) return;
    try {
      const s = localStorage.getItem(PRED_STORAGE);
      if (!s) return;
      const old = JSON.parse(s) as Record<string, unknown>[];
      if (old.length === 0) return;
      old.forEach((item) => { addPrediction(item); });
      localStorage.removeItem(PRED_STORAGE);
    } catch {}
  }, [loading]);

  const handleOpen = useCallback(() => {
    setForm({ title: '', impact: 'medium', probability: 50, reason: '', suggestion: '' });
    modal.openModal();
  }, [modal.openModal]);

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) return;
    await addPrediction({
      title: form.title,
      impact: form.impact,
      probability: form.probability,
      trend: 'flat',
      reason: form.reason || t('prediction.userCustomPredict'),
      suggestion: form.suggestion || t('prediction.pendingSuggestion'),
    });
    modal.closeModal();
    success(t('prediction.created', { title: form.title }));
  }, [form, modal.closeModal, addPrediction]);

  async function handleAiPredict() {
    setAiLoading(true);
    try {
      const kpiSummary = cell.kpis.map((k) => `${k.name}: ${k.value} (${k.trend})`).join(t('prediction.kpiSeparator'));
      const messages: ChatMessage[] = [
        { role: 'system', content: t('prediction.aiSystemPrompt') },
        { role: 'user', content: t('prediction.aiUserPrompt', { kpiSummary: kpiSummary || t('prediction.noKpiData') }) },
      ];
      const res = await chatCompletion(messages);
      const text = res.text ?? '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const preds = JSON.parse(jsonMatch[0]) as Array<{ title: string; impact: string; probability: number; reason: string; suggestion: string }>;
        for (const p of preds.slice(0, 5)) {
          await addPrediction({
            title: p.title || t('prediction.aiPredictDefault'),
            impact: (['positive', 'high', 'medium'].includes(p.impact) ? p.impact : 'medium') as 'positive' | 'high' | 'medium',
            probability: Math.min(100, Math.max(0, p.probability || 50)),
            trend: 'flat',
            reason: p.reason || t('prediction.aiAnalysis'),
            suggestion: p.suggestion || t('prediction.pendingSuggestion'),
          });
        }
        success(t('prediction.aiGenCount', { count: Math.min(preds.length, 5) }));
      } else {
        success(t('prediction.aiStructFail'));
      }
    } catch {
      success(t('prediction.aiGenFailed'));
    } finally {
      setAiLoading(false);
    }
  }

  if (loading) {
    return (
      <CardSkeleton />
    );
  }

  const allPredictions = predictions;

  const positiveRatio = allPredictions.length > 0
    ? Math.round(allPredictions.filter((p) => p.impact === 'positive').length / allPredictions.length * 100)
    : 50;

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
      <ToastOverlay toasts={toasts} />
      <div className="flex flex-wrap items-center gap-2">
        <Brain size={18} style={{ color: indColor }} />
        <span className="text-sm font-bold">{t('prediction.title')}</span>
        <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ backgroundColor: indColor + '20', color: indColor }}>{t('prediction.aiDriven')}</span>
        <span className="text-[10px] text-text-3">{t('prediction.basedOn', { count: cell.kpis.length })}</span>
        <button className="ml-auto flex flex-wrap items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20" onClick={() => { if (!pdRequire('advancedAnalytics', t('prediction.paywallReason'))) return; handleOpen(); }}>
          <Plus size={12} />{t('prediction.customPredict')}
        </button>
        <button className="flex flex-wrap items-center gap-1 rounded-lg bg-gradient-to-r from-primary to-accent px-3 py-1 text-[11px] font-bold text-white hover:shadow-lg disabled:opacity-50" onClick={() => { if (!pdRequire('advancedAnalytics', t('prediction.paywallReason'))) return; handleAiPredict(); }} disabled={aiLoading}>
          {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}{t('prediction.aiPredict')}
        </button>
      </div>

      <div className="rounded-xl border border-border p-3 md:p-4 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${indColor}08 0%, ${indColor}02 100%)` }}>
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-10" style={{ backgroundColor: indColor }} />
        <div className="relative z-10 flex flex-wrap items-center gap-4">
          <div className="flex flex-col items-center">
            <div className="relative h-16 w-16">
              <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2" className="text-surface-2" />
                <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="2" strokeLinecap="round" strokeDasharray={`${positiveRatio} ${100 - positiveRatio}`} className="text-accent" style={{ stroke: indColor }} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-lg font-extrabold">{positiveRatio}</span>
            </div>
            <span className="text-[9px] text-text-3 mt-1">{t('prediction.positiveRatio')}</span>
          </div>
          <div className="flex-1">
            <div className="text-xs font-semibold text-text mb-1">{t('prediction.overviewTitle')}</div>
            <p className="text-[11px] text-text-2 leading-relaxed">
              {allPredictions.length > 0
                ? t('prediction.overviewDesc', { total: allPredictions.length, high: allPredictions.filter((p) => p.impact === 'high').length, positive: allPredictions.filter((p) => p.impact === 'positive').length })
                : t('prediction.noPrediction')}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {allPredictions.map((p) => (
          <div key={p.id} className="rounded-xl border border-border bg-surface p-3 md:p-4 transition-all hover:border-border-2 hover:shadow-lg cursor-pointer" onClick={() => { setSelectedPred(p); editModal.openModal(); }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-text">{p.title}</span>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                  p.impact === 'positive' ? 'bg-success/10 text-success' :
                  p.impact === 'high' ? 'bg-danger/10 text-danger' :
                  'bg-warn/10 text-warn'
                }`}>
                  {p.impact === 'positive' ? t('prediction.impactPositive') : p.impact === 'high' ? t('prediction.impactHigh') : t('prediction.impactMedium')}
                </span>
                {p.trend === 'up' && <ArrowUpRight size={12} className={p.impact === 'positive' ? 'text-success' : 'text-danger'} />}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <div className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${p.probability}%`,
                    backgroundColor: p.impact === 'positive' ? 'var(--color-success)' : p.probability > 60 ? 'var(--color-danger)' : 'var(--color-warn)',
                  }}
                />
              </div>
              <span className="text-xs font-bold" style={{ color: p.impact === 'positive' ? 'var(--color-success)' : p.probability > 60 ? 'var(--color-danger)' : 'var(--color-warn)' }}>
                {p.probability}%
              </span>
            </div>
            <div className="rounded-lg bg-surface-2/50 p-2.5 mb-2">
              <div className="text-[10px] font-semibold text-text-3 mb-1">{t('prediction.reasonAnalysis')}</div>
              <p className="text-[11px] text-text-2">{p.reason}</p>
            </div>
            <div className="flex flex-wrap items-start gap-1.5">
              <Sparkles size={12} className="text-accent shrink-0 mt-0.5" style={{ color: indColor }} />
              <p className="text-[11px] text-text-2">{p.suggestion}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-primary-2">
          <Brain size={14} />
          <span className="font-semibold">{t('prediction.engineNote')}</span>
        </div>
        <p className="mt-1 text-[11px] text-text-2 leading-relaxed">
          {t('prediction.engineNoteDesc')}
        </p>
      </div>

      <Modal open={modal.open} onClose={modal.closeModal} title={t('prediction.customPredictTitle')}
        footer={
          <div className="flex flex-wrap gap-2">
            <button className={btnSecondary} onClick={modal.closeModal}>{t('common.cancel')}</button>
            <button className={btnPrimary} onClick={handleSave} disabled={!form.title.trim()}>{t('common.create')}</button>
          </div>
        }>
        <ModalField label={t('prediction.predictTitle')}>
          <input className={inputCls} placeholder={t('prediction.predictTitlePlaceholder')} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
        </ModalField>
        <ModalField label={t('prediction.impactLevel')}>
          <select className={inputCls} value={form.impact} onChange={(e) => setForm((p) => ({ ...p, impact: e.target.value as 'positive' | 'high' | 'medium' }))}>
            <option value="positive">{t('prediction.impactPositive')}</option>
            <option value="medium">{t('prediction.impactMedium')}</option>
            <option value="high">{t('prediction.impactHigh')}</option>
          </select>
        </ModalField>
        <ModalField label={t('prediction.probabilityLabel', { value: form.probability })}>
          <input type="range" min="0" max="100" value={form.probability} className="w-full accent-primary" onChange={(e) => setForm((p) => ({ ...p, probability: Number(e.target.value) }))} />
        </ModalField>
        <ModalField label={t('prediction.reasonLabel')}>
          <textarea className={inputCls} rows={2} placeholder={t('prediction.reasonPlaceholder')} value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} />
        </ModalField>
        <ModalField label={t('prediction.suggestionLabel')}>
          <textarea className={inputCls} rows={2} placeholder={t('prediction.suggestionPlaceholder')} value={form.suggestion} onChange={(e) => setForm((p) => ({ ...p, suggestion: e.target.value }))} />
        </ModalField>
      </Modal>

      <ItemDetailModal
        open={editModal.open}
        onClose={editModal.closeModal}
        title={t('prediction.editTitle')}
        fields={[
          { key: 'title', label: t('prediction.titleLabel'), type: 'text' },
          { key: 'impact', label: t('prediction.typeLabel'), type: 'select', options: [
            { value: 'positive', label: t('prediction.trendPositive') }, { value: 'high', label: t('prediction.impactHigh') }, { value: 'medium', label: t('prediction.impactMedium') },
          ]},
          { key: 'probability', label: t('prediction.confidenceLabel'), type: 'number' },
          { key: 'reason', label: t('prediction.descLabel'), type: 'textarea' },
        ]}
        data={selectedPred as Record<string, unknown> | null}
        commentTarget={selectedPred?.id ? { type: 'prediction', id: String(selectedPred.id) } : null}
        onSave={async (updated) => {
          const id = updated.id as string;
          await editPrediction(id, updated);
        }}
        onDelete={async () => {
          if (selectedPred) {
            await removePrediction(selectedPred.id);
            editModal.closeModal();
          }
        }}
      />

      <PaywallModal open={pdShow} onClose={pdClose} reason={pdReason} feature={pdFeat} />
    </div>
  );
}
