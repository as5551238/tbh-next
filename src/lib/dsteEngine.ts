/**
 * DSTE (Define-Strategy-Track-Evolve) Season Engine
 *
 * Manages OKR "seasons" (quarters/periods) with a closed-loop lifecycle:
 *   Define → Strategy → Track → Review → Evolve → next Define
 *
 * Integrates with:
 * - goals (OKRs belong to a season)
 * - reviewEngine (retro sessions belong to a season)
 * - riskEngine (risk scan per season)
 * - weeklyReport (aggregate per season)
 *
 * DR-51: Season auto-creation supports toggle
 * DR-52: Manual override always available
 * DR-53: Season completion auto-triggers review + report
 */

// ─── Types ───

export type SeasonPhase = 'define' | 'strategy' | 'track' | 'review' | 'evolve';

export interface OKRSeason {
  id: string;
  name: string;
  /** Quarter or custom period, e.g. "2026-Q3" */
  period: string;
  startDate: string;
  endDate: string;
  phase: SeasonPhase;
  goals: string[];        // goal IDs
  /** 0-100 overall season progress */
  progress: number;
  /** Key milestones in this season */
  milestones: SeasonMilestone[];
  /** Review sessions completed */
  reviewCount: number;
  /** Created timestamp */
  createdAt: string;
  /** Updated timestamp */
  updatedAt: string;
}

export interface SeasonMilestone {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
  completedAt: string | null;
}

// ─── Phase Transition Rules ───

export const PHASE_ORDER: SeasonPhase[] = ['define', 'strategy', 'track', 'review', 'evolve'];
export const PHASE_LABELS: Record<SeasonPhase, string> = {
  define: '定义期',
  strategy: '策略期',
  track: '追踪期',
  review: '复盘期',
  evolve: '进化期',
};
export const PHASE_DESCRIPTIONS: Record<SeasonPhase, string> = {
  define: '明确本周期OKR，定义关键结果和里程碑',
  strategy: '制定执行策略，分配资源和责任人',
  track: '持续追踪进展，识别偏差和风险',
  review: '周期复盘，评估目标达成度和偏差',
  evolve: '总结经验，制定下周期改进计划',
};
export const PHASE_COLORS: Record<SeasonPhase, string> = {
  define: 'bg-primary/10 text-primary-2 border-primary',
  strategy: 'bg-accent/10 text-accent border-accent',
  track: 'bg-blue-500/10 text-blue-400 border-blue-400',
  review: 'bg-warn/10 text-warn border-warn',
  evolve: 'bg-success/10 text-success border-success',
};

export function getNextPhase(current: SeasonPhase): SeasonPhase | null {
  const idx = PHASE_ORDER.indexOf(current);
  return idx < PHASE_ORDER.length - 1 ? PHASE_ORDER[idx + 1] : null;
}

export function canAdvancePhase(season: OKRSeason): { canAdvance: boolean; reason: string } {
  switch (season.phase) {
    case 'define':
      if (season.goals.length === 0) return { canAdvance: false, reason: '请先添加至少一个目标' };
      return { canAdvance: true, reason: '' };
    case 'strategy':
      if (season.milestones.length === 0) return { canAdvance: false, reason: '请定义至少一个里程碑' };
      return { canAdvance: true, reason: '' };
    case 'track':
      return { canAdvance: true, reason: '' };
    case 'review':
      if (season.reviewCount === 0) return { canAdvance: false, reason: '请完成至少一次复盘' };
      return { canAdvance: true, reason: '' };
    case 'evolve':
      return { canAdvance: false, reason: '当前赛季已进入进化期，请创建新赛季' };
  }
}

// ─── Season Factory ───

let seasonCounter = 0;

export function createSeason(
  name: string,
  startDate: string,
  endDate: string,
  period?: string,
): OKRSeason {
  seasonCounter++;
  const now = new Date().toISOString();
  return {
    id: `season_${Date.now()}_${seasonCounter}`,
    name,
    period: period ?? derivePeriod(startDate),
    startDate,
    endDate,
    phase: 'define',
    goals: [],
    progress: 0,
    milestones: [],
    reviewCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function derivePeriod(startDate: string): string {
  const d = new Date(startDate);
  const month = d.getMonth();
  const q = Math.floor(month / 3) + 1;
  return `${d.getFullYear()}-Q${q}`;
}

// ─── Season Progress Calculator ───

export function computeSeasonProgress(
  season: OKRSeason,
  goalProgresses: Array<{ id: string; progress: number }>,
): number {
  const relevant = goalProgresses.filter((g) => season.goals.includes(g.id));
  if (relevant.length === 0) return 0;
  return Math.round(relevant.reduce((sum, g) => sum + g.progress, 0) / relevant.length);
}

// ─── Quarter Helpers ───

export function getCurrentQuarter(): { period: string; startDate: string; endDate: string } {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3);
  const startMonth = q * 3;
  const year = now.getFullYear();
  const startDate = new Date(year, startMonth, 1).toISOString().slice(0, 10);
  const endMonth = startMonth + 3;
  const endDate = new Date(year, endMonth, 0).toISOString().slice(0, 10);
  return { period: `${year}-Q${q + 1}`, startDate, endDate };
}

export function getNextQuarter(): { period: string; startDate: string; endDate: string } {
  const now = new Date();
  let year = now.getFullYear();
  let q = Math.floor(now.getMonth() / 3) + 1;
  if (q > 3) { q = 0; year++; }
  const startMonth = q * 3;
  const startDate = new Date(year, startMonth, 1).toISOString().slice(0, 10);
  const endDate = new Date(year, startMonth + 3, 0).toISOString().slice(0, 10);
  return { period: `${year}-Q${q + 1}`, startDate, endDate };
}
