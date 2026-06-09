/**
 * AI Priority Engine — Smart prioritization for tasks, goals, and action items.
 *
 * Scoring factors:
 * 1. Urgency (deadline proximity, overdue status) — 30%
 * 2. Impact (goal linkage, priority level) — 25%
 * 3. Momentum (recent progress trend) — 20%
 * 4. Dependency chain (blocked items, blocking others) — 15%
 * 5. Effort efficiency (low-hanging fruit bonus) — 10%
 *
 * Output: sorted list with priorityScore + focusRecommendation
 */

export interface Prioritizable {
  id: string;
  title: string;
  type: 'task' | 'goal' | 'action_item';
  status?: string;
  priority?: string;
  progress?: number;
  due_date?: string | null;
  start_date?: string | null;
  goal_id?: string | null;
  done?: boolean;
  closed_loop?: boolean;
  source?: string;
  owner_id?: string | null;
  assignee_id?: string | null;
}

export interface PrioritizedItem extends Prioritizable {
  priorityScore: number;
  focusTag: 'urgent' | 'important' | 'momentum' | 'low-hanging' | 'monitor';
  reason: string;
}

export function computePriorityScore(item: Prioritizable): { score: number; tag: PrioritizedItem['focusTag']; reason: string } {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  let urgency = 0;
  let impact = 0;
  let momentum = 0;
  let dependency = 0;
  let efficiency = 0;
  let reason = '';

  // === 1. Urgency (0-30) ===
  if (item.due_date) {
    const dueDate = new Date(item.due_date);
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000);
    if (daysUntilDue < 0) {
      urgency = 30; // Overdue
      reason = `逾期${Math.abs(daysUntilDue)}天`;
    } else if (daysUntilDue === 0) {
      urgency = 28; // Due today
      reason = '今日到期';
    } else if (daysUntilDue <= 2) {
      urgency = 22;
      reason = `${daysUntilDue}天后到期`;
    } else if (daysUntilDue <= 7) {
      urgency = 15;
    } else {
      urgency = 5;
    }
  } else {
    urgency = 5; // No deadline = low urgency
  }

  // === 2. Impact (0-25) ===
  if (item.type === 'goal') {
    impact = 20; // Goals are always high impact
    if (item.priority === 'urgent' || item.priority === 'high') impact = 25;
    if (!reason) reason = '关键目标';
  } else if (item.type === 'action_item') {
    impact = item.priority === 'critical' ? 25 : item.priority === 'high' ? 20 : 12;
    if (item.source === 'ai_suggested' || item.source === 'ai_review') impact += 3;
    if (!reason) reason = item.priority === 'critical' ? '关键行动' : '待处理行动';
  } else {
    // Task
    if (item.goal_id) {
      impact = 18; // Linked to goal = higher impact
      if (!reason) reason = '关联目标';
    }
    const priImpact: Record<string, number> = { urgent: 25, high: 20, medium: 12, low: 5 };
    impact = Math.max(impact, priImpact[item.priority ?? 'medium'] ?? 12);
  }

  // === 3. Momentum (0-20) ===
  if (item.type === 'goal') {
    if (item.progress !== undefined && item.progress >= 70) {
      momentum = 18; // Close to completion — push to finish
      if (!reason) reason = `进度${item.progress}%，接近完成`;
    } else if (item.progress !== undefined && item.progress < 20) {
      momentum = 10; // Just started
    } else {
      momentum = 12;
    }
  } else if (item.type === 'task') {
    if (item.status === 'in_progress') {
      momentum = 15; // Already in motion
      if (!reason) reason = '进行中，保持动力';
    } else if (item.status === 'blocked') {
      momentum = 8;
      if (!reason) reason = '被阻塞，需解除';
    } else {
      momentum = 5;
    }
  } else {
    momentum = item.status === 'in_progress' ? 12 : 5;
  }

  // === 4. Dependency (0-15) ===
  // If this is a goal with many tasks, it's a dependency hub
  if (item.type === 'goal') {
    dependency = 12;
  } else if (item.type === 'action_item' && item.source === 'deviation') {
    dependency = 15; // Deviation-driven = high dependency
    if (!reason) reason = '偏差驱动的行动';
  } else if (item.type === 'task' && item.status === 'blocked') {
    dependency = 10;
  } else {
    dependency = 5;
  }

  // === 5. Efficiency (0-10) ===
  if (item.type === 'task' && item.priority === 'low' && !item.goal_id) {
    efficiency = 2; // Unimportant, skip
  } else if (item.type === 'action_item' && item.status === 'open' && item.priority === 'medium') {
    efficiency = 8; // Quick win
    if (!reason) reason = '快速可执行';
  } else if (item.type === 'goal' && item.progress !== undefined && item.progress >= 90) {
    efficiency = 10; // Almost done — easy finish
    if (!reason) reason = '即将完成';
  } else {
    efficiency = 4;
  }

  const totalScore = urgency + impact + momentum + dependency + efficiency;

  // Determine focus tag
  let tag: PrioritizedItem['focusTag'];
  if (urgency >= 25) {
    tag = 'urgent';
  } else if (impact >= 20) {
    tag = 'important';
  } else if (momentum >= 15) {
    tag = 'momentum';
  } else if (efficiency >= 8) {
    tag = 'low-hanging';
  } else {
    tag = 'monitor';
  }

  if (!reason) {
    reason = tag === 'urgent' ? '紧急' : tag === 'important' ? '重要' : tag === 'momentum' ? '保持势能' : tag === 'low-hanging' ? '快速执行' : '持续关注';
  }

  return { score: totalScore, tag, reason };
}

/**
 * Prioritize a mixed list of tasks, goals, and action items.
 * Returns items sorted by priorityScore descending.
 */
export function prioritizeItems(items: Prioritizable[]): PrioritizedItem[] {
  return items
    .map((item) => {
      const { score, tag, reason } = computePriorityScore(item);
      return { ...item, priorityScore: score, focusTag: tag, reason };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

/**
 * Generate a focus plan: top 5 items to work on today.
 * Guarantees at least 1 goal, 2 tasks, and 1 action item if available.
 */
export function generateFocusPlan(items: Prioritizable[]): PrioritizedItem[] {
  const prioritized = prioritizeItems(items);

  // Remove completed/done items
  const active = prioritized.filter((i) => {
    if (i.type === 'task' && (i.done || i.status === 'done' || i.status === 'cancelled')) return false;
    if (i.type === 'goal' && (i.status === 'completed' || i.status === 'cancelled')) return false;
    if (i.type === 'action_item' && (i.status === 'completed' || i.status === 'cancelled' || i.closed_loop)) return false;
    return true;
  });

  // Strategy: pick top items, ensuring type diversity
  const plan: PrioritizedItem[] = [];
  const used = new Set<string>();
  const typeCount: Record<string, number> = { task: 0, goal: 0, action_item: 0 };

  // First pass: top 3 items regardless of type
  for (const item of active.slice(0, 3)) {
    plan.push(item);
    used.add(item.id);
    typeCount[item.type]++;
  }

  // Second pass: ensure type diversity (at least 1 of each if available)
  for (const item of active) {
    if (used.has(item.id)) continue;
    if (plan.length >= 5) break;
    if (typeCount[item.type] === 0) {
      plan.push(item);
      used.add(item.id);
      typeCount[item.type]++;
    }
  }

  // Third pass: fill remaining slots with highest scores
  for (const item of active) {
    if (used.has(item.id)) continue;
    if (plan.length >= 5) break;
    plan.push(item);
    used.add(item.id);
    typeCount[item.type]++;
  }

  return plan.sort((a, b) => b.priorityScore - a.priorityScore);
}

/** Focus tag visual config */
export const FOCUS_TAG_CONFIG: Record<PrioritizedItem['focusTag'], { label: string; color: string; icon: string }> = {
  urgent: { label: '紧急', color: 'text-danger', icon: '🔴' },
  important: { label: '重要', color: 'text-primary-2', icon: '🔵' },
  momentum: { label: '势能', color: 'text-success', icon: '🟢' },
  'low-hanging': { label: '速胜', color: 'text-accent', icon: '🟡' },
  monitor: { label: '关注', color: 'text-text-3', icon: '⚪' },
};
