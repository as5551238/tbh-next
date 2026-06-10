import { useGateCheck } from '@/hooks/useGateCheck';
import PaywallModal from '@/components/PaywallModal';
import { useState, useCallback, useMemo } from 'react';
import { useGoals, useTasks } from '@/hooks/useMatrix';
import { cn, safeStr } from '@/lib/utils';
import { Target, CheckCircle2, Zap, Plus } from 'lucide-react';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { CardSkeleton } from '@/components/Skeleton';
import { computeAutoProgress } from '@/lib/reviewEngine';
import CommentSection from '@/components/CommentSection';
import BulkActionBar from '@/components/BulkActionBar';
import { t } from '@/lib/i18n';

export default function GoalsContent() {
  const { goals, loading, addGoal, editGoal, removeGoal } = useGoals();
  const { showPaywall, paywallReason, paywallFeature, closePaywall, requireLimit } = useGateCheck();
  const { tasks } = useTasks();
  const goalModal = useModal();
  const addGoalModal = useModal();
  const [editGoalData, setEditGoalData] = useState<{ id: string; title: string; status: string; progress: number; key_results: string[] } | null>(null);
  const [newGoalForm, setNewGoalForm] = useState({ title: '', status: 'on_track', progress: 0, end_date: '', start_date: '' });
  const [selectedGoalIds, setSelectedGoalIds] = useState<Set<string>>(new Set());

  const autoProgressMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const g of goals) {
      map[g.id] = computeAutoProgress(g.id, tasks);
    }
    return map;
  }, [goals, tasks]);

  const handleCardClick = useCallback((g: typeof goals[number]) => {
    const krTexts = g.key_results.map((kr) => typeof kr === 'string' ? kr : (kr as Record<string, unknown>).text || String(kr));
    setEditGoalData({
      id: g.id,
      title: g.title,
      status: g.status === 'active' || g.status === 'on_track' ? 'on_track' : 'at_risk',
      progress: g.progress,
      key_results: krTexts as string[],
    });
    goalModal.openModal();
  }, [goalModal.openModal]);

  const handleSyncAutoProgress = useCallback((g: typeof goals[number]) => {
    const autoProg = autoProgressMap[g.id];
    if (autoProg >= 0 && autoProg !== g.progress) {
      editGoal(g.id, { progress: autoProg });
    }
  }, [autoProgressMap, editGoal]);

  const handleEditGoalSave = useCallback(() => {
    if (!editGoalData) return;
    editGoal(editGoalData.id, {
      title: editGoalData.title,
      status: editGoalData.status,
      progress: editGoalData.progress,
      key_results: editGoalData.key_results.map((text) => ({ text, selected: false })) as typeof goals[number]['key_results'],
    });
    goalModal.closeModal();
    setEditGoalData(null);
  }, [editGoalData, editGoal, goalModal.closeModal, goals]);

  const handleKrTextChange = useCallback((idx: number, value: string) => {
    setEditGoalData((prev) => prev ? { ...prev, key_results: prev.key_results.map((t, i) => i === idx ? value : t) } : null);
  }, []);

  const handleAddKr = useCallback(() => {
    setEditGoalData((prev) => prev ? { ...prev, key_results: [...prev.key_results, ''] } : null);
  }, []);

  const handleRemoveKr = useCallback((idx: number) => {
    setEditGoalData((prev) => prev ? { ...prev, key_results: prev.key_results.filter((_, i) => i !== idx) } : null);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <Target size={18} className="text-primary-2" />
        <span className="text-sm font-bold">{t('goals.title')}</span>
        <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary-2">{t('goals.inProgress', { count: goals.length })}</span>
        <button className="flex flex-wrap items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20" onClick={() => { if (!requireLimit('maxGoals', goals.length, '免费版最多创建5个目标，升级Pro解锁更多')) return; setNewGoalForm({ title: '', status: 'on_track', progress: 0, end_date: '', start_date: '' }); addGoalModal.openModal(); }}>
          <Plus size={12} />{t('goals.newGoal')}
        </button>
      </div>
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}</div>
      ) : goals.map((g) => {
        const autoProg = autoProgressMap[g.id];
        const hasAuto = autoProg >= 0;
        const progMismatch = hasAuto && autoProg !== g.progress;
        return (
        <div key={g.id} className="rounded-xl border border-border bg-surface p-3 md:p-4 transition-all hover:border-border-2 hover:shadow-lg cursor-pointer" onClick={() => handleCardClick(g)}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex flex-wrap items-center gap-2">
              <div onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" checked={selectedGoalIds.has(g.id)} onChange={() => { setSelectedGoalIds((prev) => { const next = new Set(prev); if (next.has(g.id)) next.delete(g.id); else next.add(g.id); return next; }); }} className="h-3.5 w-3.5 accent-primary rounded" />
              </div>
              <span className="text-sm font-semibold text-text">{g.title}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {progMismatch && (
                <button className="flex flex-wrap items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold bg-accent/10 text-accent hover:bg-accent/20 transition-colors" onClick={(e) => { e.stopPropagation(); handleSyncAutoProgress(g); }}>
                  <Zap size={9} />{t('goals.sync', { value: autoProg })}
                </button>
              )}
              <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold', g.status === 'active' || g.status === 'on_track' ? 'bg-success/10 text-success' : 'bg-warn/10 text-warn')}>
                {g.status === 'active' || g.status === 'on_track' ? t('goals.normal') : t('goals.risk')}
              </span>
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-surface-2 mb-1.5 overflow-hidden relative">
            <div className={cn('h-full rounded-full transition-all', g.status === 'active' || g.status === 'on_track' ? 'bg-success' : 'bg-warn')} style={{ width: `${g.progress}%` }} />
            {hasAuto && progMismatch && (
              <div className="absolute top-0 left-0 h-full rounded-full border border-accent/40 bg-accent/10 transition-all" style={{ width: `${autoProg}%` }} />
            )}
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-text-3">{t('goals.manual', { value: g.progress })}</span>
            {hasAuto ? (
              <span className={cn('text-[10px]', progMismatch ? 'text-accent font-semibold' : 'text-text-3')}>{t('goals.aiEstimate', { value: autoProg })}</span>
            ) : (
              <span className="text-[10px] text-text-3/50">{t('goals.noLinkedTasks')}</span>
            )}
          </div>
          <div className="space-y-1">
            {g.key_results.map((kr, i) => {
              const krItem = typeof kr === 'string' ? null : kr as Record<string, unknown>;
              return (
                <div key={i} className="flex flex-wrap items-center gap-2 text-xs text-text-3">
                  <CheckCircle2 size={12} className={i < Math.ceil(g.progress / 40) ? 'text-success' : 'text-border'} />
                  <span className="flex-1">{safeStr(kr)}</span>
                  {krItem && (krItem.targetValue != null || krItem.currentValue != null) && (
                    <span className="text-[10px] text-text-3 shrink-0">
                      {String(krItem.currentValue ?? 0)}/{String(krItem.targetValue ?? '-')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        );
      })}

      <Modal open={goalModal.open} onClose={goalModal.closeModal} title={t('goals.editGoal')}
        footer={
          <div className="flex flex-wrap gap-2">
            <button className="mr-auto rounded-lg px-3 py-1.5 text-[11px] font-semibold text-danger hover:bg-danger/10" onClick={() => { if (editGoalData) { removeGoal(editGoalData.id); goalModal.closeModal(); setEditGoalData(null); } }}>{t('goals.delete')}</button>
            <button className={btnSecondary} onClick={goalModal.closeModal}>{t('common.cancel')}</button>
            <button className={btnPrimary} onClick={handleEditGoalSave}>{t('common.save')}</button>
          </div>
        }>
        {editGoalData && (
          <div>
            <ModalField label={t('goals.goalTitle')}>
              <input className={inputCls} value={editGoalData.title} onChange={(e) => setEditGoalData((p) => p ? { ...p, title: e.target.value } : null)} />
            </ModalField>
            <ModalField label={t('goals.status')}>
              <select className={inputCls} value={editGoalData.status} onChange={(e) => setEditGoalData((p) => p ? { ...p, status: e.target.value } : null)}>
                <option value="on_track">{t('goals.normal')}</option>
                <option value="at_risk">{t('goals.risk')}</option>
              </select>
            </ModalField>
            <ModalField label={t('goals.progress', { value: editGoalData.progress })}>
              <input type="range" min="0" max="100" value={editGoalData.progress} className="w-full accent-primary" onChange={(e) => setEditGoalData((p) => p ? { ...p, progress: Number(e.target.value) } : null)} />
            </ModalField>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-text-3">{t('goals.keyResults')}</div>
            {editGoalData.key_results.map((kr, i) => (
              <div key={i} className="flex items-center gap-2 mb-2 flex-wrap">
                <input className={inputCls} value={kr} placeholder={`KR ${i + 1}`} onChange={(e) => handleKrTextChange(i, e.target.value)} />
                <button className="shrink-0 text-[10px] text-danger hover:text-danger/80" onClick={() => handleRemoveKr(i)}>{t('goals.delete')}</button>
              </div>
            ))}
            <button className={btnSecondary} onClick={handleAddKr}>+ 添加{t('goals.keyResults')}</button>
            {editGoalData.id && <CommentSection targetType="goal" targetId={editGoalData.id} />}
          </div>
        )}
      </Modal>

      <Modal open={addGoalModal.open} onClose={addGoalModal.closeModal} title={t('goals.newGoalTitle')}
        footer={
          <div className="flex flex-wrap gap-2">
            <button className={btnSecondary} onClick={addGoalModal.closeModal}>{t('common.cancel')}</button>
            <button className={btnPrimary} onClick={() => { if (!newGoalForm.title.trim()) return; addGoal({ title: newGoalForm.title, status: newGoalForm.status, progress: newGoalForm.progress, key_results: [], owner_id: null, leader_id: null, end_date: newGoalForm.end_date || null, start_date: newGoalForm.start_date || null }); addGoalModal.closeModal(); }} disabled={!newGoalForm.title.trim()}>{t('common.create')}</button>
          </div>
        }>
        <ModalField label={t('goals.goalTitle')}>
          <input className={inputCls} placeholder={t('goals.goalTitlePlaceholder')} value={newGoalForm.title} onChange={(e) => setNewGoalForm((p) => ({ ...p, title: e.target.value }))} />
        </ModalField>
        <ModalField label={t('goals.status')}>
          <select className={inputCls} value={newGoalForm.status} onChange={(e) => setNewGoalForm((p) => ({ ...p, status: e.target.value }))}>
            <option value="on_track">{t('goals.normal')}</option>
            <option value="at_risk">{t('goals.risk')}</option>
          </select>
        </ModalField>
        <ModalField label={t('goals.startDate')}>
          <input type="date" className={inputCls} value={newGoalForm.start_date} onChange={(e) => setNewGoalForm((p) => ({ ...p, start_date: e.target.value }))} />
        </ModalField>
        <ModalField label={t('goals.endDate')}>
          <input type="date" className={inputCls} value={newGoalForm.end_date} onChange={(e) => setNewGoalForm((p) => ({ ...p, end_date: e.target.value }))} />
        </ModalField>
      </Modal>

      <BulkActionBar
        selectedCount={selectedGoalIds.size}
        onSelectAll={() => setSelectedGoalIds(new Set(goals.map((g) => g.id)))}
        onDeselectAll={() => setSelectedGoalIds(new Set())}
        onBatchStatus={(status) => { selectedGoalIds.forEach((id) => editGoal(id, { status })); setSelectedGoalIds(new Set()); }}
        onBatchDelete={() => { selectedGoalIds.forEach((id) => removeGoal(id)); setSelectedGoalIds(new Set()); }}
        onBatchAssign={(assignee) => { /* goals don't have assignee, no-op */ }}
      />
      <PaywallModal open={showPaywall} onClose={closePaywall} reason={paywallReason} feature={paywallFeature} />
    </div>
  );
}
