/**
 * AI Task Routing Engine — 经验教训L9转化
 *
 * 从TBH Review提取：TBH的aiRoutingEngine有5种策略但无降级方案，
 * 路由失败时无fallback到手动分配，导致用户卡在"分配中"状态。
 *
 * tbh-next改进：每条路由策略都有explicit fallback，
 * 路由失败时自动降级到手动分配+用户通知。
 */

export type RoutingStrategy = 'load-balance' | 'best-fit' | 'growth' | 'urgency' | 'auto';

export interface RoutingResult {
  assigneeId: string;
  confidence: number;
  strategy: RoutingStrategy;
  reason: string;
  /** 是否为降级结果 */
  isFallback: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  priority: string;
  skills?: string[];
  urgency?: number;
}

export interface MemberProfile {
  id: string;
  name: string;
  skills?: string[];
  workload?: number;
  growthAreas?: string[];
}

const STRATEGY_LABELS: Record<RoutingStrategy, string> = {
  'load-balance': '负载均衡',
  'best-fit': '最佳匹配',
  'growth': '成长优先',
  'urgency': '紧急优先',
  'auto': '智能选择',
};

export { STRATEGY_LABELS };

/** 自动选择策略：基于任务和团队特征推断最佳策略 */
function autoSelectStrategy(task: TaskItem, members: MemberProfile[]): RoutingStrategy {
  if (task.urgency && task.urgency >= 4) return 'urgency';
  if (members.length <= 2) return 'load-balance';
  const workloadVariance = calcWorkloadVariance(members);
  if (workloadVariance > 0.3) return 'load-balance';
  return 'best-fit';
}

function calcWorkloadVariance(members: MemberProfile[]): number {
  if (members.length === 0) return 0;
  const workloads = members.map((m) => m.workload ?? 0);
  const avg = workloads.reduce((a, b) => a + b, 0) / workloads.length;
  const variance = workloads.reduce((sum, w) => sum + (w - avg) ** 2, 0) / workloads.length;
  return avg > 0 ? variance / (avg * avg) : 0;
}

/** 负载均衡：分配给当前负载最低的成员 */
function routeLoadBalance(members: MemberProfile[]): RoutingResult | null {
  const sorted = [...members].sort((a, b) => (a.workload ?? 0) - (b.workload ?? 0));
  const chosen = sorted[0];
  if (!chosen) return null;
  return {
    assigneeId: chosen.id,
    confidence: 0.7,
    strategy: 'load-balance',
    reason: `当前负载最低(${chosen.workload ?? 0}个任务)`,
    isFallback: false,
  };
}

/** 最佳匹配：基于技能匹配度 */
function routeBestFit(task: TaskItem, members: MemberProfile[]): RoutingResult | null {
  const taskSkills = task.skills ?? [];
  if (taskSkills.length === 0) return null;
  let bestMember: MemberProfile | null = null;
  let bestScore = 0;
  for (const m of members) {
    const memberSkills = m.skills ?? [];
    const overlap = taskSkills.filter((s) => memberSkills.includes(s)).length;
    const score = overlap / taskSkills.length;
    if (score > bestScore) {
      bestScore = score;
      bestMember = m;
    }
  }
  if (!bestMember || bestScore === 0) return null;
  return {
    assigneeId: bestMember.id,
    confidence: bestScore,
    strategy: 'best-fit',
    reason: `技能匹配度${Math.round(bestScore * 100)}%`,
    isFallback: false,
  };
}

/** 成长优先：分配给成长领域匹配的成员 */
function routeGrowth(task: TaskItem, members: MemberProfile[]): RoutingResult | null {
  const taskSkills = task.skills ?? [];
  let bestMember: MemberProfile | null = null;
  let bestScore = 0;
  for (const m of members) {
    const growthAreas = m.growthAreas ?? [];
    const overlap = taskSkills.filter((s) => growthAreas.includes(s)).length;
    const score = taskSkills.length > 0 ? overlap / taskSkills.length : 0;
    if (score > bestScore) {
      bestScore = score;
      bestMember = m;
    }
  }
  if (!bestMember || bestScore === 0) return null;
  return {
    assigneeId: bestMember.id,
    confidence: bestScore * 0.8,
    strategy: 'growth',
    reason: `成长领域匹配度${Math.round(bestScore * 100)}%`,
    isFallback: false,
  };
}

/** 紧急优先：分配给当前无高优先级任务的成员 */
function routeUrgency(members: MemberProfile[]): RoutingResult | null {
  const sorted = [...members].sort((a, b) => (a.workload ?? 0) - (b.workload ?? 0));
  const chosen = sorted[0];
  if (!chosen) return null;
  return {
    assigneeId: chosen.id,
    confidence: 0.8,
    strategy: 'urgency',
    reason: `最可用成员(负载${chosen.workload ?? 0})`,
    isFallback: false,
  };
}

/**
 * 主路由入口 — 经验教训L9核心改进：
 * 无论何种策略失败，都自动降级到负载均衡。
 * 负载均衡也失败→返回fallback结果(isFallback=true)，由调用方展示手动分配UI。
 */
export function routeTask(
  task: TaskItem,
  members: MemberProfile[],
  strategy: RoutingStrategy = 'auto',
): RoutingResult {
  const effectiveStrategy = strategy === 'auto' ? autoSelectStrategy(task, members) : strategy;

  let result: RoutingResult | null = null;

  try {
    switch (effectiveStrategy) {
      case 'load-balance':
        result = routeLoadBalance(members);
        break;
      case 'best-fit':
        result = routeBestFit(task, members);
        break;
      case 'growth':
        result = routeGrowth(task, members);
        break;
      case 'urgency':
        result = routeUrgency(members);
        break;
      default:
        result = routeLoadBalance(members);
    }
  } catch {
    result = null;
  }

  // L9改进：策略失败→降级到负载均衡
  if (!result && effectiveStrategy !== 'load-balance') {
    result = routeLoadBalance(members);
    if (result) {
      return { ...result, isFallback: true, reason: `[降级]${result.reason}` };
    }
  }

  // 终极降级：无任何可用成员→返回fallback标记
  if (!result) {
    return {
      assigneeId: '',
      confidence: 0,
      strategy: effectiveStrategy,
      reason: '无法自动分配，请手动指定',
      isFallback: true,
    };
  }

  return result;
}

/** 批量路由 */
export function routeBatchTasks(
  tasks: TaskItem[],
  members: MemberProfile[],
  strategy: RoutingStrategy = 'auto',
): RoutingResult[] {
  return tasks.map((t) => routeTask(t, members, strategy));
}
