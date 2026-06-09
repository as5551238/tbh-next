import { useState, useCallback } from 'react';
import { useToast, ToastOverlay } from '@/hooks/useToast';
import { useRisks, useMatrixCell, useActionItems } from '@/hooks/useMatrix';
import { useMLOOFeedback } from '@/hooks/useMLOOFeedback';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { AlertTriangle, Clock, TrendingDown, Shield, Loader2, Plus, Trash2, Zap } from 'lucide-react';
import { CardSkeleton } from '@/components/Skeleton';
import { hasFeature } from '@/lib/subscription';
import PaywallModal from '@/components/PaywallModal';

const LEVEL_STYLES: Record<string, string> = {
  critical: 'bg-danger/10 text-danger border-l-danger',
  high: 'bg-warn/10 text-warn border-l-warn',
  medium: 'bg-primary/10 text-primary-2 border-l-primary',
  low: 'bg-surface-2 text-text-3 border-l-border',
};

const LEVEL_DOT: Record<string, string> = { critical: 'bg-danger', high: 'bg-warn', medium: 'bg-primary-2', low: 'bg-text-3' };

export default function RiskView() {
  const [showPaywall, setShowPaywall] = useState(false);
  const { risks, loading, addRisk, editRisk, removeRisk } = useRisks();
  const { cell } = useMatrixCell();
  const { addActionItem } = useActionItems();
  const { triggerFeedback } = useMLOOFeedback();
  const industry = useAppStore((s) => s.industry);
  const addModal = useModal();
  const detailModal = useModal();
    const { toasts } = useToast();
const [selectedRisk, setSelectedRisk] = useState<typeof risks[number] | null>(null);
  const [form, setForm] = useState({ title: '', level: 'medium' as 'critical' | 'high' | 'medium' | 'low', description: '', source: '', affected_kpi: '', status: 'active' as 'active' | 'watching' | 'resolved' });

  const activeRisks = risks.filter((r) => r.status !== 'resolved');
  const criticalCount = risks.filter((r) => r.level === 'critical' && r.status === 'active').length;

  if (loading) {
    return (
      <CardSkeleton />
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ToastOverlay toasts={toasts} />
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Shield size={16} className="text-primary-2" />
        <span className="text-sm font-bold">风险预警</span>
        {criticalCount > 0 && <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-bold text-danger">{criticalCount} 紧急</span>}
        <span className="text-[10px] text-text-3">{activeRisks.length} 活跃风险</span>
        <button className="ml-auto flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20" onClick={() => { setForm({ title: '', level: 'medium', description: '', source: '', affected_kpi: '', status: 'active' }); addModal.openModal(); }}>
          <Plus size={12} />上报风险
        </button>
      </div>

      {/* AI Summary — generated from actual risk data */}
      <div className="mx-4 mt-3 rounded-xl border border-warn/20 bg-warn/5 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-warn mb-1">
          <AlertTriangle size={14} />风险概览
        </div>
        <p className="text-[11px] text-text-2 leading-relaxed">
          {activeRisks.length === 0
            ? '暂无活跃风险。'
            : criticalCount > 0
              ? `当前有 ${criticalCount} 个紧急风险需立即处理，${activeRisks.length} 个活跃风险待关注。建议优先处理紧急项。`
              : `当前共 ${activeRisks.length} 个活跃风险，其中高优先级 ${risks.filter((r) => r.level === 'high' && r.status !== 'resolved').length} 个。建议持续监控。`}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {risks.map((risk) => (
          <div key={risk.id} onClick={() => { setSelectedRisk(risk); detailModal.openModal(); }} className={cn('rounded-xl border border-border border-l-2 bg-surface p-4 transition-all hover:shadow-lg cursor-pointer', LEVEL_STYLES[risk.level].split(' ').pop(),
            risk.status === 'resolved' && 'opacity-40'
          )}>
            <div className="flex items-center gap-2 mb-1.5">
              <div className={cn('h-2 w-2 rounded-full shrink-0', LEVEL_DOT[risk.level])} />
              <span className="text-sm font-semibold text-text">{risk.title}</span>
              <span className={cn('ml-auto rounded-full px-2 py-0.5 text-[8px] font-bold shrink-0', LEVEL_STYLES[risk.level].split(' ').slice(0, 2).join(' '))}>
                {risk.level === 'critical' ? '紧急' : risk.level === 'high' ? '高' : risk.level === 'medium' ? '中' : '低'}
              </span>
            </div>
            <p className="text-xs text-text-2 mb-2 leading-relaxed">{risk.description}</p>
            <div className="flex flex-wrap items-center gap-3 text-[10px] text-text-3">
              <span>来源: {risk.source}</span>
              <span className="flex items-center gap-1"><Clock size={9} />{risk.detected_at}</span>
              {risk.affected_kpi && <span className="flex items-center gap-1"><TrendingDown size={9} />影响: {risk.affected_kpi}</span>}
              <span className={cn('ml-auto', risk.status === 'active' ? 'text-danger' : risk.status === 'watching' ? 'text-warn' : 'text-success')}>
                {risk.status === 'active' ? '活跃' : risk.status === 'watching' ? '观察中' : '已解决'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Risk Modal */}
      <Modal open={addModal.open} onClose={addModal.closeModal} title="上报风险"
        footer={
          <div className="flex gap-2">
            <button className={btnSecondary} onClick={addModal.closeModal}>取消</button>
            <button className={btnPrimary} onClick={() => { if (!form.title.trim()) return; addRisk({ title: form.title, level: form.level, description: form.description, source: form.source || '手动上报', affected_kpi: form.affected_kpi || null, status: form.status, detected_at: new Date().toISOString().split('T')[0], team_id: '__default__' }).then((risk) => { triggerFeedback({ type: 'risk_created', action: 'created', entity: risk }); }).catch((err) => { console.error('[risk]', err); toast('操作失败，请重试', 'error'); }); addModal.closeModal(); }} disabled={!form.title.trim()}>创建</button>
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
      </Modal>

      {/* Risk Detail / Edit / Delete Modal */}
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
                <button className="flex items-center gap-1 rounded-lg bg-accent/10 px-3 py-1.5 text-[11px] font-semibold text-accent hover:bg-accent/20" onClick={() => { addActionItem({ title: `风险应对: ${selectedRisk.title}`, description: selectedRisk.description, source: 'deviation', source_id: selectedRisk.id, goal_id: selectedRisk.affected_kpi, priority: selectedRisk.level === 'critical' ? 'critical' : selectedRisk.level === 'high' ? 'high' : 'medium', status: 'open', closed_loop: false } as Parameters<typeof addActionItem>[0]); detailModal.closeModal(); }}><Zap size={10} />生成行动项</button>
              )}
            </>
          ) : undefined
        }>
        {selectedRisk && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={cn('h-2 w-2 rounded-full', LEVEL_DOT[selectedRisk.level])} />
              <span className="text-sm font-semibold text-text">{selectedRisk.title}</span>
              <span className={cn('ml-auto rounded-full px-2 py-0.5 text-[8px] font-bold', LEVEL_STYLES[selectedRisk.level].split(' ').slice(0, 2).join(' '))}>
                {selectedRisk.level === 'critical' ? '紧急' : selectedRisk.level === 'high' ? '高' : selectedRisk.level === 'medium' ? '中' : '低'}
              </span>
            </div>
            <p className="text-xs text-text-2 leading-relaxed">{selectedRisk.description}</p>
            <div className="flex flex-wrap gap-3 text-[10px] text-text-3">
              <span>来源: {selectedRisk.source}</span>
              <span className="flex items-center gap-1"><Clock size={9} />{selectedRisk.detected_at}</span>
              {selectedRisk.affected_kpi && <span><TrendingDown size={9} className="inline" /> 影响: {selectedRisk.affected_kpi}</span>}
            </div>
            <div className={cn('rounded-lg px-3 py-2 text-xs font-medium', selectedRisk.status === 'active' ? 'bg-danger/10 text-danger' : selectedRisk.status === 'watching' ? 'bg-warn/10 text-warn' : 'bg-success/10 text-success')}>
              {selectedRisk.status === 'active' ? '活跃' : selectedRisk.status === 'watching' ? '观察中' : '已解决'}
            </div>
          </div>
        )}
      </Modal>
    
      <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} reason="风险分析需要专业版或企业版" feature="ai_risk_analysis" />
</div>
  );
}
