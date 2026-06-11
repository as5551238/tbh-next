import { useState, useCallback } from 'react';
import {
  createSeason, canAdvancePhase, getNextPhase, computeSeasonProgress,
  getCurrentQuarter, getNextQuarter,
  PHASE_ORDER, PHASE_LABELS, PHASE_DESCRIPTIONS, PHASE_COLORS,
  type OKRSeason, type SeasonPhase, type SeasonMilestone,
} from '@/lib/dsteEngine';
import { useGoals } from '@/hooks/useMatrix';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { cn } from '@/lib/utils';
import { useToast, ToastOverlay } from '@/hooks/useToast';
import { Trophy, ChevronRight, Plus, ArrowRight, Clock, Target, Milestone, RotateCcw, Zap } from 'lucide-react';

export default function DSTEView() {
  const navigateTo = useAppStore((s) => s.navigateTo);
  const { goals } = useGoals();
  const { toasts, success } = useToast();
  const createModal = useModal();
  const milestoneModal = useModal();
  const [seasons, setSeasons] = useState<OKRSeason[]>(() => {
    // Initialize with current quarter
    const cq = getCurrentQuarter();
    const s = createSeason(cq.period + ' 赛季', cq.startDate, cq.endDate, cq.period);
    return [s];
  });
  const [selectedSeason, setSelectedSeason] = useState<OKRSeason | null>(null);
  const [seasonForm, setSeasonForm] = useState({ name: '', startDate: '', endDate: '' });
  const [milestoneForm, setMilestoneForm] = useState({ title: '', dueDate: '' });
  const [editingMilestoneSeason, setEditingMilestoneSeason] = useState<string | null>(null);

  const handleCreateSeason = useCallback(() => {
    if (!seasonForm.name.trim()) return;
    const s = createSeason(seasonForm.name, seasonForm.startDate, seasonForm.endDate);
    setSeasons((prev) => [s, ...prev]);
    createModal.closeModal();
    success(`赛季"${s.name}"已创建`);
    setSeasonForm({ name: '', startDate: '', endDate: '' });
  }, [seasonForm, createModal, success]);

  const handleAdvancePhase = useCallback((seasonId: string) => {
    setSeasons((prev) => prev.map((s) => {
      if (s.id !== seasonId) return s;
      const check = canAdvancePhase(s);
      if (!check.canAdvance) return s;
      const next = getNextPhase(s.phase);
      if (!next) return s;
      return { ...s, phase: next, updatedAt: new Date().toISOString() };
    }));
    success('阶段已推进');
  }, [success]);

  const handleAddMilestone = useCallback(() => {
    if (!milestoneForm.title.trim() || !editingMilestoneSeason) return;
    const m: SeasonMilestone = {
      id: `ms_${Date.now()}`,
      title: milestoneForm.title,
      dueDate: milestoneForm.dueDate,
      completed: false,
      completedAt: null,
    };
    setSeasons((prev) => prev.map((s) => {
      if (s.id !== editingMilestoneSeason) return s;
      return { ...s, milestones: [...s.milestones, m], updatedAt: new Date().toISOString() };
    }));
    milestoneModal.closeModal();
    success('里程碑已添加');
    setMilestoneForm({ title: '', dueDate: '' });
  }, [milestoneForm, editingMilestoneSeason, milestoneModal, success]);

  const handleToggleMilestone = useCallback((seasonId: string, milestoneId: string) => {
    setSeasons((prev) => prev.map((s) => {
      if (s.id !== seasonId) return s;
      return {
        ...s,
        milestones: s.milestones.map((m) =>
          m.id === milestoneId ? { ...m, completed: !m.completed, completedAt: !m.completed ? new Date().toISOString() : null } : m
        ),
        updatedAt: new Date().toISOString(),
      };
    }));
  }, []);

  const handleAddGoal = useCallback((seasonId: string, goalId: string) => {
    setSeasons((prev) => prev.map((s) => {
      if (s.id !== seasonId) return s;
      if (s.goals.includes(goalId)) return s;
      return { ...s, goals: [...s.goals, goalId], updatedAt: new Date().toISOString() };
    }));
  }, []);

  const activeSeason = seasons[0]; // latest season

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ToastOverlay toasts={toasts} />
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <Trophy size={16} className="text-primary-2" />
        <span className="text-sm font-bold">DSTE 赛季管理</span>
        <span className="text-[10px] text-text-3">Define → Strategy → Track → Review → Evolve</span>
        <button className="ml-auto flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20" onClick={() => {
          const nq = getNextQuarter();
          setSeasonForm({ name: nq.period + ' 赛季', startDate: nq.startDate, endDate: nq.endDate });
          createModal.openModal();
        }}>
          <Plus size={12} />新赛季
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
        {/* Active Season Card */}
        {activeSeason && (
          <>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Trophy size={16} className="text-primary-2" />
                <span className="text-sm font-bold text-primary-2">{activeSeason.name}</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary-2">{activeSeason.period}</span>
                <span className="text-[10px] text-text-3">{activeSeason.startDate} ~ {activeSeason.endDate}</span>
              </div>

              {/* Phase progress bar */}
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

              {/* Current phase description + advance button */}
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
                          推进到{PHASE_LABELS[next]}
                          {!check.canAdvance && <span className="ml-1 text-[8px]">({check.reason})</span>}
                        </button>
                      ) : (
                        <span className="text-[10px] text-success font-semibold">赛季已完成，请创建新赛季</span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="rounded-lg bg-surface p-2 text-center">
                  <div className="text-sm font-bold text-primary-2">{activeSeason.goals.length}</div>
                  <div className="text-[9px] text-text-3">关联目标</div>
                </div>
                <div className="rounded-lg bg-surface p-2 text-center">
                  <div className="text-sm font-bold text-accent">{computeSeasonProgress(activeSeason, goals.map(g => ({ id: g.id, progress: g.progress })))}%</div>
                  <div className="text-[9px] text-text-3">综合进度</div>
                </div>
                <div className="rounded-lg bg-surface p-2 text-center">
                  <div className="text-sm font-bold text-warn">{activeSeason.milestones.filter(m => !m.completed).length}</div>
                  <div className="text-[9px] text-text-3">待完成里程碑</div>
                </div>
              </div>
            </div>

            {/* Goals in this season */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-text-3 uppercase tracking-wider">关联目标</span>
                <button className="text-[10px] text-primary-2 hover:underline" onClick={() => navigateTo('workspace', 'goals')}>
                  管理目标 →
                </button>
              </div>
              {activeSeason.goals.length === 0 ? (
                <div className="rounded-lg border border-border bg-surface p-3 text-[11px] text-text-3">
                  暂无关联目标。在"定义期"阶段，请为目标添加到此赛季。
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

            {/* Milestones */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-text-3 uppercase tracking-wider">里程碑</span>
                <button className="flex items-center gap-1 rounded-lg bg-accent/10 px-2 py-1 text-[10px] font-semibold text-accent hover:bg-accent/20" onClick={() => { setEditingMilestoneSeason(activeSeason.id); milestoneModal.openModal(); }}>
                  <Plus size={10} />添加
                </button>
              </div>
              {activeSeason.milestones.length === 0 ? (
                <div className="text-[11px] text-text-3">暂无里程碑。推进到"策略期"时建议添加。</div>
              ) : (
                <div className="space-y-1">
                  {activeSeason.milestones.map((m) => (
                    <div key={m.id} className={cn('flex items-center gap-3 rounded-lg border bg-surface px-3 py-2 cursor-pointer hover:border-border-2 transition-colors', m.completed ? 'border-success/30 opacity-60' : 'border-border')} onClick={() => handleToggleMilestone(activeSeason.id, m.id)}>
                      <Milestone size={13} className={m.completed ? 'text-success' : 'text-text-3'} />
                      <span className={cn('text-[11px] flex-1', m.completed ? 'line-through text-text-3' : 'text-text')}>{m.title}</span>
                      <span className="text-[9px] text-text-3">{m.dueDate}</span>
                      {m.completed && <span className="text-[8px] text-success">已完成</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick action: start review */}
            {activeSeason.phase === 'review' && (
              <div className="rounded-xl border border-warn/20 bg-warn/5 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <RotateCcw size={14} className="text-warn" />
                  <span className="text-xs font-semibold text-warn">复盘期</span>
                </div>
                <p className="text-[11px] text-text-2 mb-2">当前处于复盘期，建议完成至少一次复盘后推进。</p>
                <button className="flex items-center gap-1 rounded-lg bg-warn/10 px-3 py-1 text-[10px] font-semibold text-warn hover:bg-warn/20" onClick={() => navigateTo('workspace', 'review')}>
                  <Zap size={10} />前往复盘
                </button>
              </div>
            )}
          </>
        )}

        {/* Past seasons */}
        {seasons.length > 1 && (
          <div>
            <span className="text-xs font-bold text-text-3 uppercase tracking-wider">历史赛季</span>
            <div className="space-y-1.5 mt-2">
              {seasons.slice(1).map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 opacity-60">
                  <Trophy size={13} className="text-text-3" />
                  <span className="text-[11px] text-text-2">{s.name}</span>
                  <span className="text-[9px] text-text-3">{s.period}</span>
                  <span className="ml-auto text-[9px] text-success">{PHASE_LABELS[s.phase]}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Season Modal */}
      <Modal open={createModal.open} onClose={createModal.closeModal} title="创建新赛季"
        footer={<><button className={btnSecondary} onClick={createModal.closeModal}>取消</button><button className={btnPrimary} onClick={handleCreateSeason} disabled={!seasonForm.name.trim()}>创建</button></>}>
        <ModalField label="赛季名称">
          <input className={inputCls} placeholder="如 2026-Q3 赛季" value={seasonForm.name} onChange={(e) => setSeasonForm((p) => ({ ...p, name: e.target.value }))} />
        </ModalField>
        <ModalField label="开始日期">
          <input type="date" className={inputCls} value={seasonForm.startDate} onChange={(e) => setSeasonForm((p) => ({ ...p, startDate: e.target.value }))} />
        </ModalField>
        <ModalField label="结束日期">
          <input type="date" className={inputCls} value={seasonForm.endDate} onChange={(e) => setSeasonForm((p) => ({ ...p, endDate: e.target.value }))} />
        </ModalField>
      </Modal>

      {/* Add Milestone Modal */}
      <Modal open={milestoneModal.open} onClose={milestoneModal.closeModal} title="添加里程碑"
        footer={<><button className={btnSecondary} onClick={milestoneModal.closeModal}>取消</button><button className={btnPrimary} onClick={handleAddMilestone} disabled={!milestoneForm.title.trim()}>添加</button></>}>
        <ModalField label="里程碑标题">
          <input className={inputCls} placeholder="输入里程碑标题" value={milestoneForm.title} onChange={(e) => setMilestoneForm((p) => ({ ...p, title: e.target.value }))} />
        </ModalField>
        <ModalField label="截止日期">
          <input type="date" className={inputCls} value={milestoneForm.dueDate} onChange={(e) => setMilestoneForm((p) => ({ ...p, dueDate: e.target.value }))} />
        </ModalField>
      </Modal>
    </div>
  );
}
