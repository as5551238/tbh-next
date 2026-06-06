import { useState, useCallback, useEffect } from 'react';
import { useMatrixCell, useIndustryColor } from '@/hooks/useMatrix';
import { useToast, ToastOverlay } from '@/hooks/useToast';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, Lightbulb, ArrowUpRight, ArrowDownRight, BarChart3, Plus } from 'lucide-react';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import ItemDetailModal from '@/components/ItemDetailModal';

const INSIGHTS_STORAGE = 'tbh-insights';

const DEFAULT_INSIGHTS = [
  { title: '需求交付周期趋势', desc: '近4周维持在13-14天，稳定在目标范围内', impact: 'positive', kpi: '需求交付周期' },
  { title: '功能使用率异常', desc: '导出功能使用率从25%骤降至12%，与上次UI改版时间吻合', impact: 'negative', kpi: '功能使用率' },
  { title: 'PRD评审效率提升', desc: '引入标准化模板后，PRD一次性通过率从65%提升至82%', impact: 'positive', kpi: 'PRD通过率' },
  { title: 'NPS下降预警', desc: '连续2周低于目标线，主要集中在Onboarding环节', impact: 'negative', kpi: 'NPS' },
];

const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus };

export default function InsightContent() {
  const { cell, loading } = useMatrixCell();
  const indColor = useIndustryColor();
  const industry = useAppStore((s) => s.industry);
  const modal = useModal();
  const editModal = useModal();
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<(typeof localInsights)[number] | null>(null);
  const [form, setForm] = useState({ title: '', desc: '', impact: 'positive' as 'positive' | 'negative', kpi: '' });
  const { toasts, success } = useToast();
  const [localInsights, setLocalInsights] = useState(() => {
    try { const s = localStorage.getItem(INSIGHTS_STORAGE); return s ? JSON.parse(s) : DEFAULT_INSIGHTS; } catch { return DEFAULT_INSIGHTS; }
  });

  useEffect(() => {
    try { localStorage.setItem(INSIGHTS_STORAGE, JSON.stringify(localInsights)); } catch {}
  }, [localInsights]);

  const handleOpen = useCallback(() => {
    setForm({ title: '', desc: '', impact: 'positive', kpi: '' });
    modal.openModal();
  }, [modal.openModal]);

  const handleSave = useCallback(() => {
    if (!form.title.trim()) return;
    setLocalInsights((prev) => [{ title: form.title, desc: form.desc, impact: form.impact, kpi: form.kpi }, ...prev]);
    modal.closeModal();
    success(`洞察"${form.title}"已创建`);
  }, [form, modal.closeModal]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ToastOverlay toasts={toasts} />
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Lightbulb size={16} className="text-primary-2" />
        <span className="text-sm font-bold">数据洞察</span>
        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[9px] font-bold text-accent">AI分析</span>
        <button className="ml-auto flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20" onClick={handleOpen}>
          <Plus size={12} />新建洞察
        </button>
      </div>

      <div className="mx-4 mt-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary-2 mb-1"><Lightbulb size={14} />AI 洞察摘要</div>
        <p className="text-[11px] text-text-2 leading-relaxed">
          {localInsights.length > 0
            ? `当前共 ${localInsights.length} 条洞察：${localInsights.filter((i) => i.impact === 'negative').length} 个需关注项，${localInsights.filter((i) => i.impact === 'positive').length} 个正向趋势。建议优先处理负面指标。`
            : '暂无洞察数据，点击"新建洞察"添加。'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {localInsights.map((insight, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-4 transition-all hover:shadow-lg cursor-pointer" onClick={() => { setSelectedIdx(i); setSelectedInsight(insight); editModal.openModal(); }}>
            <div className="flex items-center gap-2 mb-2">
              <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg shrink-0',
                insight.impact === 'positive' ? 'bg-success/10' : 'bg-danger/10'
              )}>
                {insight.impact === 'positive' ? <ArrowUpRight size={14} className="text-success" /> : <ArrowDownRight size={14} className="text-danger" />}
              </div>
              <span className="text-sm font-semibold text-text">{insight.title}</span>
              <span className={cn('ml-auto rounded-full px-2 py-0.5 text-[8px] font-bold',
                insight.impact === 'positive' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
              )}>
                {insight.impact === 'positive' ? '正向' : '需关注'}
              </span>
            </div>
            <p className="text-xs text-text-2 leading-relaxed mb-2">{insight.desc}</p>
            <div className="text-[9px] text-text-3">关联指标: {insight.kpi}</div>
          </div>
        ))}

        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-text-3 mb-3">指标趋势总览</div>
          <div className="grid grid-cols-2 gap-2">
            {cell.kpis.map((kpi) => {
              const TI = TREND_ICON[kpi.trend];
              return (
                <div key={kpi.name} className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
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
      </div>

      <Modal open={modal.open} onClose={modal.closeModal} title="新建洞察"
        footer={
          <div className="flex gap-2">
            <button className={btnSecondary} onClick={modal.closeModal}>取消</button>
            <button className={btnPrimary} onClick={handleSave} disabled={!form.title.trim()}>创建</button>
          </div>
        }>
        <ModalField label="洞察标题">
          <input className={inputCls} placeholder="输入洞察标题" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
        </ModalField>
        <ModalField label="详细描述">
          <textarea className={inputCls} rows={3} placeholder="输入洞察描述" value={form.desc} onChange={(e) => setForm((p) => ({ ...p, desc: e.target.value }))} />
        </ModalField>
        <ModalField label="影响方向">
          <select className={inputCls} value={form.impact} onChange={(e) => setForm((p) => ({ ...p, impact: e.target.value as 'positive' | 'negative' }))}>
            <option value="positive">正向</option>
            <option value="negative">需关注</option>
          </select>
        </ModalField>
        <ModalField label="关联指标">
          <input className={inputCls} placeholder="如：NPS、交付周期" value={form.kpi} onChange={(e) => setForm((p) => ({ ...p, kpi: e.target.value }))} />
        </ModalField>
      </Modal>

      <ItemDetailModal
        open={editModal.open}
        onClose={editModal.closeModal}
        title="编辑洞察"
        fields={[
          { key: 'title', label: '标题', type: 'text' },
          { key: 'kpi', label: '分类', type: 'text' },
          { key: 'desc', label: '描述', type: 'textarea' },
          { key: 'impact', label: '影响', type: 'select', options: [
            { value: 'positive', label: '高' }, { value: 'medium', label: '中' }, { value: 'negative', label: '低' },
          ]},
        ]}
        data={selectedInsight}
        onSave={(updated) => {
          if (selectedIdx !== null) {
            setLocalInsights(prev => prev.map((item, idx) => idx === selectedIdx ? { ...item, ...updated } as (typeof localInsights)[number] : item));
          }
        }}
        onDelete={() => {
          if (selectedIdx !== null) {
            setLocalInsights(prev => prev.filter((_, idx) => idx !== selectedIdx));
          }
        }}
      />
    </div>
  );
}
