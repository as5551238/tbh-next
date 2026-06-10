import { useGateCheck } from '@/hooks/useGateCheck';
import PaywallModal from '@/components/PaywallModal';
import { hasFeature } from '@/lib/subscription';
import { useState, useCallback, useEffect } from 'react';
import { usePredictions, useMatrixCell, useIndustryColor } from '@/hooks/useMatrix';
import { useToast, ToastOverlay } from '@/hooks/useToast';
import { Brain, TrendingUp, AlertTriangle, Sparkles, ArrowUpRight, Plus, Loader2 } from 'lucide-react';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import ItemDetailModal from '@/components/ItemDetailModal';
import { CardSkeleton } from '@/components/Skeleton';
import { chatCompletion, type ChatMessage } from '@/lib/aiService';

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

  // Migrate localStorage items to DB on first load
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
      reason: form.reason || '用户自定义预测',
      suggestion: form.suggestion || '待补充建议',
    });
    modal.closeModal();
    success(`预测"${form.title}"已创建`);
  }, [form, modal.closeModal, addPrediction]);

  async function handleAiPredict() {
    setAiLoading(true);
    try {
      const kpiSummary = cell.kpis.map((k) => `${k.name}: ${k.value} (${k.trend})`).join('、');
      const messages: ChatMessage[] = [
        { role: 'system', content: '你是一个团队业务分析专家。根据提供的团队KPI数据，预测未来1-2周可能出现的关键趋势和风险。每个预测请用JSON数组返回，每个元素包含title、impact(positive/high/medium)、probability(0-100)、reason、suggestion字段。' },
        { role: 'user', content: `基于当前团队数据，预测以下维度的趋势：${kpiSummary || '暂无KPI数据'}。请给出3-5个预测。只返回JSON数组，不要其他文字。` },
      ];
      const res = await chatCompletion(messages);
      const text = res.text ?? '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const preds = JSON.parse(jsonMatch[0]) as Array<{ title: string; impact: string; probability: number; reason: string; suggestion: string }>;
        for (const p of preds.slice(0, 5)) {
          await addPrediction({
            title: p.title || 'AI预测',
            impact: (['positive', 'high', 'medium'].includes(p.impact) ? p.impact : 'medium') as 'positive' | 'high' | 'medium',
            probability: Math.min(100, Math.max(0, p.probability || 50)),
            trend: 'flat',
            reason: p.reason || 'AI分析',
            suggestion: p.suggestion || '待补充建议',
          });
        }
        success(`AI已生成${Math.min(preds.length, 5)}个预测`);
      } else {
        success('AI未能返回结构化预测，请手动添加');
      }
    } catch {
      success('AI预测生成失败，请手动添加');
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
        <span className="text-sm font-bold">预测引擎</span>
        <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ backgroundColor: indColor + '20', color: indColor }}>AI驱动</span>
        <span className="text-[10px] text-text-3">基于 {cell.kpis.length} 个指标 · 每日更新</span>
        <button className="ml-auto flex flex-wrap items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20" onClick={() => { if (!pdRequire('advancedAnalytics', 'AI预测需要专业版或企业版')) return; handleOpen(); }}>
          <Plus size={12} />自定义预测
        </button>
        <button className="flex flex-wrap items-center gap-1 rounded-lg bg-gradient-to-r from-primary to-accent px-3 py-1 text-[11px] font-bold text-white hover:shadow-lg disabled:opacity-50" onClick={() => { if (!pdRequire('advancedAnalytics', 'AI预测需要专业版或企业版')) return; handleAiPredict(); }} disabled={aiLoading}>
          {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}AI 预测
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
            <span className="text-[9px] text-text-3 mt-1">正向比例</span>
          </div>
          <div className="flex-1">
            <div className="text-xs font-semibold text-text mb-1">综合预测概览</div>
            <p className="text-[11px] text-text-2 leading-relaxed">
              {allPredictions.length > 0
                ? `共 ${allPredictions.length} 个预测项，${allPredictions.filter((p) => p.impact === 'high').length} 个高风险需关注，${allPredictions.filter((p) => p.impact === 'positive').length} 个利好趋势。`
                : '暂无预测，点击"自定义预测"添加。'}
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
                  {p.impact === 'positive' ? '利好' : p.impact === 'high' ? '高风险' : '中风险'}
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
              <div className="text-[10px] font-semibold text-text-3 mb-1">原因分析</div>
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
          <span className="font-semibold">预测引擎说明</span>
        </div>
        <p className="mt-1 text-[11px] text-text-2 leading-relaxed">
          预测基于历史数据趋势、资源分配状态和行业基准综合计算。置信度越高，预测越可靠。建议重点关注概率 &gt; 60% 的风险项。
        </p>
      </div>

      <Modal open={modal.open} onClose={modal.closeModal} title="自定义预测"
        footer={
          <div className="flex flex-wrap gap-2">
            <button className={btnSecondary} onClick={modal.closeModal}>取消</button>
            <button className={btnPrimary} onClick={handleSave} disabled={!form.title.trim()}>创建</button>
          </div>
        }>
        <ModalField label="预测标题">
          <input className={inputCls} placeholder="输入预测标题" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
        </ModalField>
        <ModalField label="影响级别">
          <select className={inputCls} value={form.impact} onChange={(e) => setForm((p) => ({ ...p, impact: e.target.value as 'positive' | 'high' | 'medium' }))}>
            <option value="positive">利好</option>
            <option value="medium">中风险</option>
            <option value="high">高风险</option>
          </select>
        </ModalField>
        <ModalField label={`概率 (${form.probability}%)`}>
          <input type="range" min="0" max="100" value={form.probability} className="w-full accent-primary" onChange={(e) => setForm((p) => ({ ...p, probability: Number(e.target.value) }))} />
        </ModalField>
        <ModalField label="原因分析">
          <textarea className={inputCls} rows={2} placeholder="输入原因分析" value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} />
        </ModalField>
        <ModalField label="建议措施">
          <textarea className={inputCls} rows={2} placeholder="输入建议措施" value={form.suggestion} onChange={(e) => setForm((p) => ({ ...p, suggestion: e.target.value }))} />
        </ModalField>
      </Modal>

      <ItemDetailModal
        open={editModal.open}
        onClose={editModal.closeModal}
        title="编辑预测"
        fields={[
          { key: 'title', label: '标题', type: 'text' },
          { key: 'impact', label: '类型', type: 'select', options: [
            { value: 'positive', label: '趋势利好' }, { value: 'high', label: '高风险' }, { value: 'medium', label: '中风险' },
          ]},
          { key: 'probability', label: '置信度', type: 'number' },
          { key: 'reason', label: '描述', type: 'textarea' },
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
