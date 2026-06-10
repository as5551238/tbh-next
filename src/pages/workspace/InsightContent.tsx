import { useState, useCallback } from 'react';
import { useMatrixCell, useIndustryColor, useInsights } from '@/hooks/useMatrix';
import { useToast, ToastOverlay } from '@/hooks/useToast';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, Lightbulb, ArrowUpRight, ArrowDownRight, Plus, Trash2, Lock, RefreshCw } from 'lucide-react';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { hasFeature } from '@/lib/subscription';
import PaywallModal from '@/components/PaywallModal';

const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus };

export default function InsightContent() {
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
    success(`洞察"${form.title}"已创建`);
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
    success('洞察已更新');
  }, [editId, editForm, editInsight, editModal, success]);

  const handleDelete = useCallback(async (id: string) => {
    await removeInsight(id);
    editModal.closeModal();
    success('洞察已删除');
  }, [removeInsight, editModal, success]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ToastOverlay toasts={toasts} />
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <Lightbulb size={16} className="text-primary-2" />
        <span className="text-sm font-bold">数据洞察</span>
        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[9px] font-bold text-accent">数据分析</span>
        <button className="ml-auto flex flex-wrap items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20" onClick={handleOpen}>
          <Plus size={12} />新建洞察
        </button>
      </div>

      <div className="mx-4 mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3 md:p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-primary-2 mb-1"><Lightbulb size={14} />洞察概览</div>
        <p className="text-[11px] text-text-2 leading-relaxed">
          {displayInsights.length > 0
            ? `当前共 ${displayInsights.length} 条洞察：${displayInsights.filter((i) => i.impact === 'negative').length} 个需关注项，${displayInsights.filter((i) => i.impact === 'positive').length} 个正向趋势。建议优先处理负面指标。`
            : '暂无洞察数据，将在使用过程中自动生成'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">
        {displayInsights.length === 0 ? (
          <div className="text-center py-12">
            <Lightbulb size={32} className="mx-auto text-text-3 mb-3" />
            <p className="text-sm text-text-2 font-semibold">暂无洞察数据</p>
            <p className="text-xs text-text-3 mt-1">将在使用过程中自动生成</p>
            <button onClick={handleRefresh} className="mt-3 inline-flex flex-wrap items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary-2 hover:bg-primary/20" disabled={refreshing}>
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />刷新
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
                  {insight.impact === 'positive' ? '正向' : '需关注'}
                </span>
              </div>
              <p className="text-xs text-text-2 leading-relaxed mb-2">{insight.description}</p>
              <div className="text-[9px] text-text-3">关联指标: {insight.kpi}</div>
            </div>
          ))}

        {hasFeature('advancedAnalytics') ? (
          <div className="rounded-xl border border-border bg-surface p-3 md:p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-text-3 mb-3">指标趋势总览</div>
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
            <p className="text-[11px] text-text-3 mb-2">指标趋势总览需要专业版</p>
            <button
              className="rounded-lg bg-primary px-3 py-1 text-[10px] font-semibold text-white hover:opacity-80"
              onClick={() => setShowPaywall(true)}
            >
              升级专业版
            </button>
          </div>
        )}
          </>
        )}
      </div>

      <Modal open={modal.open} onClose={modal.closeModal} title="新建洞察"
        footer={
          <div className="flex flex-wrap gap-2">
            <button className={btnSecondary} onClick={modal.closeModal}>取消</button>
            <button className={btnPrimary} onClick={handleSave} disabled={!form.title.trim()}>创建</button>
          </div>
        }>
        <ModalField label="洞察标题">
          <input className={inputCls} placeholder="输入洞察标题" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
        </ModalField>
        <ModalField label="详细描述">
          <textarea className={inputCls} rows={3} placeholder="输入洞察描述" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
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

      <Modal open={editModal.open} onClose={editModal.closeModal} title="编辑洞察"
        footer={
          <div className="flex flex-wrap gap-2">
            {editId && (
              <button className="flex flex-wrap items-center gap-1 rounded-lg bg-danger/10 px-3 py-1.5 text-[10px] text-danger hover:bg-danger/20 mr-auto" onClick={() => handleDelete(editId)}>
                <Trash2 size={10} />删除
              </button>
            )}
            <button className={btnSecondary} onClick={editModal.closeModal}>取消</button>
            <button className={btnPrimary} onClick={handleEditSave} disabled={!editForm.title.trim()}>保存</button>
          </div>
        }>
        <ModalField label="洞察标题">
          <input className={inputCls} value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} />
        </ModalField>
        <ModalField label="详细描述">
          <textarea className={inputCls} rows={3} value={editForm.description} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} />
        </ModalField>
        <ModalField label="影响方向">
          <select className={inputCls} value={editForm.impact} onChange={(e) => setEditForm((p) => ({ ...p, impact: e.target.value }))}>
            <option value="positive">正向</option>
            <option value="negative">需关注</option>
          </select>
        </ModalField>
        <ModalField label="关联指标">
          <input className={inputCls} value={editForm.kpi} onChange={(e) => setEditForm((p) => ({ ...p, kpi: e.target.value }))} />
        </ModalField>
      </Modal>

      <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} reason="指标趋势总览需要专业版或企业版" feature="advanced_analytics" />
    </div>
  );
}
