import type { ApprovalRow } from '@/lib/dataLayer';
import { useState } from 'react';
import { useMatrixCell, useApprovals } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, AlertTriangle, ChevronRight, User, X, Plus } from 'lucide-react';
import { useModal, btnPrimary, btnSecondary, inputCls } from '@/components/Modal';
import ItemDetailModal from '@/components/ItemDetailModal';
import type { FieldDef } from '@/components/ItemDetailModal';
import type { ApprovalInput } from '@/contracts/dataContracts';
import { useMLOOFeedback } from '@/hooks/useMLOOFeedback';
import { CardSkeleton } from '@/components/Skeleton';
import { t } from '@/lib/i18n';



const TYPE_LABELS: Record<string, () => string> = { leave: () => t('approvals.typeLeave'), expense: () => t('approvals.typeExpense'), purchase: () => t('approvals.typePurchase'), access: () => t('approvals.typeAccess'), project: () => t('approvals.typeProject') };
const URGENCY_STYLES: Record<string, string> = { urgent: 'bg-danger/10 text-danger', normal: 'bg-warn/10 text-warn', low: 'bg-surface-2 text-text-3' };
const STATUS_STYLES: Record<string, string> = { pending: 'bg-warn/10 text-warn', approved: 'bg-success/10 text-success', rejected: 'bg-danger/10 text-danger' };
const STATUS_LABELS: Record<string, () => string> = { pending: () => t('approvals.statusPending'), approved: () => t('approvals.statusApproved'), rejected: () => t('approvals.statusRejected') };

export default function ApprovalsView() {
  const APPROVAL_FIELDS: FieldDef[] = [
    { key: 'title', label: t('approvals.fieldTitle'), type: 'text', editable: true },
    { key: 'status', label: t('approvals.fieldStatus'), type: 'select', editable: true, options: [
      { value: 'pending', label: t('approvals.statusPending') },
      { value: 'approved', label: t('approvals.statusApproved') },
      { value: 'rejected', label: t('approvals.statusRejected') },
    ]},
    { key: 'type', label: t('approvals.fieldType'), type: 'text', editable: true },
    { key: 'description', label: t('approvals.fieldDescription'), type: 'text', editable: true },
    { key: 'urgency', label: t('approvals.fieldUrgency'), type: 'select', editable: true, options: [
      { value: 'urgent', label: t('approvals.urgencyUrgent') },
      { value: 'normal', label: t('approvals.urgencyNormal') },
      { value: 'low', label: t('approvals.urgencyLow') },
    ]},
  ];

  const { cell, loading: cellLoading } = useMatrixCell();
  const { approvals, addApproval, editApproval, removeApproval, loading } = useApprovals();
  const { triggerFeedback } = useMLOOFeedback();
  const industry = useAppStore((s) => s.industry);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const detailModal = useModal();
  const createModal = useModal();
  const [selected, setSelected] = useState<ApprovalRow | null>(null);
  const [form, setForm] = useState({ title: '', type: 'expense', description: '', urgency: 'normal' });

  const filtered = filter === 'all' ? approvals : approvals.filter((a) => a.status === filter);
  const pendingCount = approvals.filter((a) => a.status === 'pending').length;

  async function handleCreate() {
    if (!form.title.trim()) return;
    await addApproval({
      title: form.title.trim(),
      type: form.type,
      description: form.description || undefined,
      urgency: form.urgency,
      status: 'pending',
      applicant_id: '我',
      created_at: new Date().toISOString(),
    } as ApprovalInput);
    setForm({ title: '', type: 'expense', description: '', urgency: 'normal' });
    createModal.closeModal();
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <span className="text-sm font-bold">{t('approvals.title')}</span>
        {pendingCount > 0 && (
          <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-bold text-danger">{t('approvals.pendingBadge', { count: pendingCount })}</span>
        )}
        <div className="ml-auto flex flex-wrap gap-1">
          <button onClick={createModal.openModal} className="rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20 transition-colors">{t('approvals.submitApproval')}</button>
          {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn('rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-colors',
                filter === f ? 'bg-primary/10 text-primary-2' : 'text-text-3 hover:bg-surface-2'
              )}
            >
              {f === 'all' ? t('approvals.filterAll') : STATUS_LABELS[f]()}
            </button>
          ))}
        </div>
      </div>

      {/* Alert */}
      {pendingCount > 0 && (() => {
        const oldest = approvals.filter((a) => a.status === 'pending').sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))[0];
        return oldest ? (
          <div className="mx-4 mt-3 rounded-xl border border-warn/20 bg-warn/5 px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-warn">
              <AlertTriangle size={14} />
              <span className="font-semibold">{t('approvals.alertHeading')}</span>
            </div>
            <p className="mt-1 text-[11px] text-text-2">
              {t('approvals.alertMessage', { title: oldest.title })}
            </p>
          </div>
        ) : null;
      })()}

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2">
        {loading ? (
          <CardSkeleton />
        ) : (
        filtered.map((item) => (
          <div key={item.id} className={cn('group rounded-xl border border-border bg-surface p-4 transition-all hover:border-border-2 hover:shadow-lg cursor-pointer',
            item.status === 'pending' && 'border-l-2 border-l-warn'
          )} onClick={() => { setSelected(item); detailModal.openModal(); }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-text">{item.title}</span>
                <span className={cn('rounded-full px-1.5 py-0.5 text-[8px] font-bold', URGENCY_STYLES[item.urgency])}>
                  {item.urgency === 'urgent' ? t('approvals.urgencyUrgent') : item.urgency === 'normal' ? t('approvals.urgencyNormal') : t('approvals.urgencyLow')}
                </span>
              </div>
              <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold', STATUS_STYLES[item.status])}>
                {STATUS_LABELS[item.status]()}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[10px] text-text-3">
              <span className="flex flex-wrap items-center gap-1"><User size={10} />{item.applicant_id}</span>
              <span>{TYPE_LABELS[item.type]?.() ?? item.type}</span>
              {item.description && <span>{item.description}</span>}
                <span className="flex flex-wrap items-center gap-1"><Clock size={10} />{item.created_at}</span>
            </div>
            {item.status === 'pending' && (
              <div className="flex flex-wrap gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); editApproval(item.id, { status: 'approved' }); triggerFeedback({ type: 'approval', action: 'approved', entity: item as unknown as Record<string, unknown> }); }} className="rounded-lg bg-success/10 px-3 py-1.5 text-[10px] font-semibold text-success hover:bg-success/20 transition-colors">{t('approvals.approve')}</button>
                <button onClick={(e) => { e.stopPropagation(); editApproval(item.id, { status: 'rejected' }); triggerFeedback({ type: 'approval', action: 'rejected', entity: item as unknown as Record<string, unknown> }); }} className="rounded-lg bg-danger/10 px-3 py-1.5 text-[10px] font-semibold text-danger hover:bg-danger/20 transition-colors">{t('approvals.reject')}</button>
                <button onClick={(e) => { e.stopPropagation(); setSelected(item); detailModal.openModal(); }} className="rounded-lg bg-surface-2 px-3 py-1.5 text-[10px] font-semibold text-text-3 hover:text-text transition-colors">
                  {t('approvals.details')} <ChevronRight size={10} className="inline" />
                </button>
              </div>
            )}
          </div>
        ))
        )}
      </div>

      <ItemDetailModal open={detailModal.open} onClose={detailModal.closeModal} title={t('approvals.detailTitle')} fields={APPROVAL_FIELDS} data={selected as unknown as Record<string, unknown> | null} commentTarget={selected?.id ? { type: 'approval', id: String(selected.id) } : null} onSave={(updated) => { if (selected) { editApproval(selected.id, updated); } }} onDelete={() => { if (selected) { removeApproval(selected.id); detailModal.closeModal(); } }} extraFooter={
        selected?.status === 'pending' ? (
          <>
            <button type="button" onClick={() => { if (selected) { editApproval(selected.id, { status: 'approved' }); detailModal.closeModal(); triggerFeedback({ type: 'approval', action: 'approved', entity: selected as unknown as Record<string, unknown> }); } }} className="rounded-lg bg-success/10 px-4 py-2 text-xs font-semibold text-success hover:bg-success/20 transition-colors">{t('approvals.approve')}</button>
            <button type="button" onClick={() => { if (selected) { editApproval(selected.id, { status: 'rejected' }); detailModal.closeModal(); triggerFeedback({ type: 'approval', action: 'rejected', entity: selected as unknown as Record<string, unknown> }); } }} className="rounded-lg bg-danger/10 px-4 py-2 text-xs font-semibold text-danger hover:bg-danger/20 transition-colors">{t('approvals.reject')}</button>
          </>
        ) : undefined
      } />

      {/* Create Approval Modal */}
      {createModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={createModal.closeModal}>
          <div className="w-96 rounded-xl border border-border bg-surface-2 p-3 md:p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold">{t('approvals.createModalTitle')}</span>
              <button onClick={createModal.closeModal} aria-label={t('approvals.closeAria')} className="text-text-3 hover:text-text"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-text-3 mb-1 block">{t('approvals.titleLabel')}</label>
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder={t('approvals.titlePlaceholder')} className={inputCls + ' w-full'} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-text-3 mb-1 block">{t('approvals.typeLabel')}</label>
                  <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className={inputCls + ' w-full'}>
                    <option value="expense">{t('approvals.typeExpense')}</option>
                    <option value="leave">{t('approvals.typeLeave')}</option>
                    <option value="purchase">{t('approvals.typePurchase')}</option>
                    <option value="access">{t('approvals.typeAccess')}</option>
                    <option value="project">{t('approvals.typeProject')}</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-text-3 mb-1 block">{t('approvals.urgencyLabel')}</label>
                  <select value={form.urgency} onChange={(e) => setForm((f) => ({ ...f, urgency: e.target.value }))} className={inputCls + ' w-full'}>
                    <option value="normal">{t('approvals.urgencyNormal')}</option>
                    <option value="urgent">{t('approvals.urgencyUrgent')}</option>
                    <option value="low">{t('approvals.urgencyLow')}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-text-3 mb-1 block">{t('approvals.descLabel')}</label>
                <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder={t('approvals.descPlaceholder')} className={inputCls + ' w-full'} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <button onClick={handleCreate} disabled={!form.title.trim()} className={`${btnPrimary} disabled:opacity-40`}>{t('approvals.submit')}</button>
              <button onClick={createModal.closeModal} className={btnSecondary}>{t('approvals.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
