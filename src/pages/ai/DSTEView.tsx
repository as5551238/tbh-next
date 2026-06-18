import { useState, useCallback, useRef, useEffect } from 'react';
import { t } from '@/lib/i18n';
import {
  createSeason, canAdvancePhase, getNextPhase, computeSeasonProgress,
  getCurrentQuarter, getNextQuarter, loadSeasons, loadSeasonsFromDB, saveSeasons,
  deleteSeasonFromDB,
  PHASE_ORDER, PHASE_LABELS, PHASE_DESCRIPTIONS, PHASE_COLORS,
  type OKRSeason, type SeasonPhase, type SeasonMilestone,
} from '@/lib/dsteEngine';
import { useGoals } from '@/hooks/useMatrix';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { cn } from '@/lib/utils';
import { useToast, ToastOverlay } from '@/hooks/useToast';
import { trackEvent } from '@/lib/behaviorTracker';
import { Trophy, ChevronRight, Plus, ArrowRight, Clock, Target, Milestone, RotateCcw, Zap } from 'lucide-react';

export default function DSTEView() {
  const navigateTo = useAppStore((s) => s.navigateTo);
  const { goals } = useGoals();
  const { toasts, success } = useToast();
  const createModal = useModal();
  const milestoneModal = useModal();
  const [seasons, setSeasons] = useState<OKRSeason[]>(() => loadSeasons());
  const [dbLoaded, setDbLoaded] = useState(false);
  const seasonsRef = useRef(seasons);
  seasonsRef.current = seasons;

  useEffect(() => {
    if (dbLoaded) return;
    loadSeasonsFromDB().then((db) => {
      if (db.length > 0) {
        setSeasons(db);
        seasonsRef.current = db;
        saveSeasons(db);
      }
      setDbLoaded(true);
    }).catch(() => setDbLoaded(true));
  }, [dbLoaded]);

  const updateSeasons = useCallback((updater: (prev: OKRSeason[]) => OKRSeason[]) => {
    setSeasons((prev) => {
      const next = updater(prev);
      saveSeasons(next);
      return next;
    });
  }, []);

  const [selectedSeason, setSelectedSeason] = useState<OKRSeason | null>(null);
  const [seasonForm, setSeasonForm] = useState({ name: '', startDate: '', endDate: '' });
  const [milestoneForm, setMilestoneForm] = useState({ title: '', dueDate: '' });
  const [editingMilestoneSeason, setEditingMilestoneSeason] = useState<string | null>(null);

  const handleCreateSeason = useCallback(() => {
    if (!seasonForm.name.trim()) return;
    const s = createSeason(seasonForm.name, seasonForm.startDate, seasonForm.endDate);
    updateSeasons((prev) => [s, ...prev]);
    createModal.closeModal();
    trackEvent('season_create', { name: s.name });
    success(t('dste.seasonCreated', { name: s.name }));
    setSeasonForm({ name: '', startDate: '', endDate: '' });
  }, [seasonForm, createModal, success, updateSeasons]);

  const handleAdvancePhase = useCallback((seasonId: string) => {
    updateSeasons((prev) => prev.map((s) => {
      if (s.id !== seasonId) return s;
      const check = canAdvancePhase(s);
      if (!check.canAdvance) return s;
      const next = getNextPhase(s.phase);
      if (!next) return s;
      return { ...s, phase: next, updatedAt: new Date().toISOString() };
    }));
    trackEvent('season_phase_advance', { seasonId });
    success(t('dste.phaseAdvanced'));
  }, [success, updateSeasons]);

  const handleAddMilestone = useCallback(() => {
    if (!milestoneForm.title.trim() || !editingMilestoneSeason) return;
    const m: SeasonMilestone = {
      id: `ms_${Date.now()}`,
      title: milestoneForm.title,
      dueDate: milestoneForm.dueDate,
      completed: false,
      completedAt: null,
    };
    updateSeasons((prev) => prev.map((s) => {
      if (s.id !== editingMilestoneSeason) return s;
      return { ...s, milestones: [...s.milestones, m], updatedAt: new Date().toISOString() };
    }));
    milestoneModal.closeModal();
    success(t('dste.milestoneAdded'));
    setMilestoneForm({ title: '', dueDate: '' });
  }, [milestoneForm, editingMilestoneSeason, milestoneModal, success, updateSeasons]);

  const handleToggleMilestone = useCallback((seasonId: string, milestoneId: string) => {
    updateSeasons((prev) => prev.map((s) => {
      if (s.id !== seasonId) return s;
      return {
        ...s,
        milestones: s.milestones.map((m) =>
          m.id === milestoneId ? { ...m, completed: !m.completed, completedAt: !m.completed ? new Date().toISOString() : null } : m
        ),
        updatedAt: new Date().toISOString(),
      };
    }));
  }, [updateSeasons]);

  const handleAddGoal = useCallback((seasonId: string, goalId: string) => {
    updateSeasons((prev) => prev.map((s) => {
      if (s.id !== seasonId) return s;
      if (s.goals.includes(goalId)) return s;
      return { ...s, goals: [...s.goals, goalId], updatedAt: new Date().toISOString() };
    }));
  }, [updateSeasons]);

  const handleDeleteSeason = useCallback((seasonId: string) => {
    updateSeasons((prev) => prev.filter((s) => s.id !== seasonId));
    deleteSeasonFromDB(seasonId);
    if (selectedSeason?.id === seasonId) setSelectedSeason(null);
    trackEvent('season_delete', { seasonId });
    success(t('dste.seasonDeleted'));
  }, [updateSeasons, selectedSeason, success]);

  const activeSeason = seasons[0];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ToastOverlay toasts={toasts} />
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <Trophy size={16} className="text-primary-2" />
        <span className="text-sm font-bold">{t('dste.title')}</span>
        <span className="text-[10px] text-text-3">Define → Strategy → Track → Review → Evolve</span>
        <button className="ml-auto flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20" onClick={() => {
          const nq = getNextQuarter();
          setSeasonForm({ name: t('dste.seasonNameAuto', { period: nq.period }), startDate: nq.startDate, endDate: nq.endDate });
          createModal.openModal();
        }}>
          <Plus size={12} />{t('dste.newSeason')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
        {activeSeason && (
          <>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Trophy size={16} className="text-primary-2" />
                <span className="text-sm font-bold text-primary-2">{activeSeason.name}</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary-2">{activeSeason.period}</span>
                <span className="text-[10px] text-text-3">{activeSeason.startDate} ~ {activeSeason.endDate}</span>
              </div>

              <div className="flex items-center gap-1 mb-3">
                {PHASE_ORDER.map((p, i) => (
                  <div key={p} className="flex items-center gap-1 flex-1">
                    <div className={cn('rounded-lg px-2 py-1 text-[9px] font-bold text-center flex-1 transition-all',
                      p === activeSeason.phase
                        ? PHASE_COLORS[p]
                        : PHASE_ORDER.indexOf(p) < PHASE_ORDER.indexOf(activeSeason.phase)
                          ? 'bg-success/10 text-success'
                          : 'bg-surface-2 text-text-3'
                    )} style={{ borderWidth: 1, borderStyle: 'solid', borderColor: 'transparent' }}>
                      {PHASE_LABELS[p]}
                    </div>
                    {i < PHASE_ORDER.length - 1 && <ChevronRight size={10} className="text-text-3 shrink-0" />}
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-3 rounded-lg bg-surface p-3">
                <div className={cn('rounded-lg px-2 py-1 text-[9px] font-bold shrink-0', PHASE_COLORS[activeSeason.phase])}>
                  {PHASE_LABELS[activeSeason.phase]}
                </div>
                <div className="flex-1">
                  <p className="text-[11px] text-text-2">{PHASE_DESCRIPTIONS[activeSeason.phase]}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {(() => {
                      const check = canAdvancePhase(activeSeason);
                      const next = getNextPhase(activeSeason.phase);
                      return next ? (
                        <button
                          className={cn('flex items-center gap-1 rounded-lg px-3 py-1 text-[10px] font-semibold', check.canAdvance ? 'bg-primary-2/10 text-primary-2 hover:bg-primary-2/20' : 'bg-surface-2 text-text-3 cursor-not-allowed')}
                          onClick={() => check.canAdvance && handleAdvancePhase(activeSeason.id)}
                          disabled={!check.canAdvance}
                          title={check.reason}
                        >
                          <ArrowRight size={10} />
                          {t('dste.advanceTo', { phase: PHASE_LABELS[next] })}
                          {!check.canAdvance && <span className="ml-1 text-[8px]">({check.reason})</span>}
                        </button>
                      ) : (
                        <span className="text-[10px] text-success font-semibold">{t('dste.seasonComplete')}</span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="rounded-lg bg-surface p-2 text-center">
                  <div className="text-sm font-bold text-primary-2">{activeSeason.goals.length}</div>
                  <div className="text-[9px] text-text-3">{t('dste.linkedGoals')}</div>
                </div>
                <div className="rounded-lg bg-surface p-2 text-center">
                  <div className="text-sm font-bold text-accent">{computeSeasonProgress(activeSeason, goals.map(g => ({ id: g.id, progress: g.progress })))}%</div>
                  <div className="text-[9px] text-text-3">{t('dste.overallProgress')}</div>
                </div>
                <div className="rounded-lg bg-surface p-2 text-center">
                  <div className="text-sm font-bold text-warn">{activeSeason.milestones.filter(m => !m.completed).length}</div>
                  <div className="text-[9px] text-text-3">{t('dste.pendingMilestones')}</div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-text-3 uppercase tracking-wider">{t('dste.linkedGoals')}</span>
                <button className="text-[10px] text-primary-2 hover:underline" onClick={() => navigateTo('workspace', 'goals')}>
                  {t('dste.manageGoals')}
                </button>
              </div>
              {activeSeason.goals.length === 0 ? (
                <div className="rounded-lg border border-border bg-surface p-3 text-[11px] text-text-3">
                  {t('dste.noLinkedGoals')}
                  <div className="mt-2 space-y-1">
                    {goals.slice(0, 5).map((g) => (
                      <button key={g.id} className="flex items-center gap-2 w-full rounded-lg bg-surface-2 px-2 py-1 text-[10px] text-text-2 hover:bg-primary/5" onClick={() => handleAddGoal(activeSeason.id, g.id)}>
                        <Plus size={10} className="text-primary-2" />
                        {g.title} ({Math.round(g.progress)}%)
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {goals.filter((g) => activeSeason.goals.includes(g.id)).map((g) => (
                    <div key={g.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2">
                      <Target size={13} className="text-primary-2 shrink-0" />
                      <span className="text-[11px] font-semibold text-text flex-1 truncate">{g.title}</span>
                      <div className="w-20 h-1.5 rounded-full bg-surface-2 overflow-hidden shrink-0">
                        <div className="h-full rounded-full bg-primary-2" style={{ width: `${g.progress}%` }} />
                      </div>
                      <span className="text-[9px] text-text-3 shrink-0">{Math.round(g.progress)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-text-3 uppercase tracking-wider">{t('dste.milestones')}</span>
                <button className="flex items-center gap-1 rounded-lg bg-accent/10 px-2 py-1 text-[10px] font-semibold text-accent hover:bg-accent/20" onClick={() => { setEditingMilestoneSeason(activeSeason.id); milestoneModal.openModal(); }}>
                  <Plus size={10} />{t('dste.add')}
                </button>
              </div>
              {activeSeason.milestones.length === 0 ? (
                <div className="text-[11px] text-text-3">{t('dste.noMilestones')}</div>
              ) : (
                <div className="space-y-1">
                  {activeSeason.milestones.map((m) => (
                    <div key={m.id} className={cn('flex items-center gap-3 rounded-lg border bg-surface px-3 py-2 cursor-pointer hover:border-border-2 transition-colors', m.completed ? 'border-success/30 opacity-60' : 'border-border')} onClick={() => handleToggleMilestone(activeSeason.id, m.id)}>
                      <Milestone size={13} className={m.completed ? 'text-success' : 'text-text-3'} />
                      <span className={cn('text-[11px] flex-1', m.completed ? 'line-through text-text-3' : 'text-text')}>{m.title}</span>
                      <span className="text-[9px] text-text-3">{m.dueDate}</span>
                      {m.completed && <span className="text-[8px] text-success">{t('dste.completed')}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {activeSeason.phase === 'review' && (
              <div className="rounded-xl border border-warn/20 bg-warn/5 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <RotateCcw size={14} className="text-warn" />
                  <span className="text-xs font-semibold text-warn">{t('dste.reviewPhase')}</span>
                </div>
                <p className="text-[11px] text-text-2 mb-2">{t('dste.reviewPhaseDesc')}</p>
                <button className="flex items-center gap-1 rounded-lg bg-warn/10 px-3 py-1 text-[10px] font-semibold text-warn hover:bg-warn/20" onClick={() => navigateTo('workspace', 'review')}>
                  <Zap size={10} />{t('dste.goReview')}
                </button>
              </div>
            )}
          </>
        )}

        {seasons.length > 1 && (
          <div>
            <span className="text-xs font-bold text-text-3 uppercase tracking-wider">{t('dste.pastSeasons')}</span>
            <div className="space-y-1.5 mt-2">
              {seasons.slice(1).map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 opacity-60">
                  <Trophy size={13} className="text-text-3" />
                  <span className="text-[11px] text-text-2">{s.name}</span>
                  <span className="text-[9px] text-text-3">{s.period}</span>
                  <span className="text-[9px] text-success">{PHASE_LABELS[s.phase]}</span>
                  <button className="ml-auto text-[9px] text-red-400 hover:text-red-600 transition-colors" onClick={() => handleDeleteSeason(s.id)}>{t('dste.delete')}</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal open={createModal.open} onClose={createModal.closeModal} title={t('dste.createSeason')}
        footer={<><button className={btnSecondary} onClick={createModal.closeModal}>{t('dste.cancel')}</button><button className={btnPrimary} onClick={handleCreateSeason} disabled={!seasonForm.name.trim()}>{t('dste.create')}</button></>}>
        <ModalField label={t('dste.seasonName')}>
          <input className={inputCls} placeholder={t('dste.seasonNamePlaceholder')} value={seasonForm.name} onChange={(e) => setSeasonForm((p) => ({ ...p, name: e.target.value }))} />
        </ModalField>
        <ModalField label={t('dste.startDate')}>
          <input type="date" className={inputCls} value={seasonForm.startDate} onChange={(e) => setSeasonForm((p) => ({ ...p, startDate: e.target.value }))} />
        </ModalField>
        <ModalField label={t('dste.endDate')}>
          <input type="date" className={inputCls} value={seasonForm.endDate} onChange={(e) => setSeasonForm((p) => ({ ...p, endDate: e.target.value }))} />
        </ModalField>
      </Modal>

      <Modal open={milestoneModal.open} onClose={milestoneModal.closeModal} title={t('dste.addMilestone')}
        footer={<><button className={btnSecondary} onClick={milestoneModal.closeModal}>{t('dste.cancel')}</button><button className={btnPrimary} onClick={handleAddMilestone} disabled={!milestoneForm.title.trim()}>{t('dste.add')}</button></>}>
        <ModalField label={t('dste.milestoneTitle')}>
          <input className={inputCls} placeholder={t('dste.milestoneTitlePlaceholder')} value={milestoneForm.title} onChange={(e) => setMilestoneForm((p) => ({ ...p, title: e.target.value }))} />
        </ModalField>
        <ModalField label={t('dste.dueDate')}>
          <input type="date" className={inputCls} value={milestoneForm.dueDate} onChange={(e) => setMilestoneForm((p) => ({ ...p, dueDate: e.target.value }))} />
        </ModalField>
      </Modal>
    </div>
  );
}
