/**
 * MLOO-Lite Feedback Module — 协作回流到OKR
 *
 * When collab operations happen (approval, meeting, task status change),
 * this module auto-generates:
 * 1. ActionItems linked to goals
 * 2. Notifications to goal owners
 * 3. Auto-sync goal progress from task completion
 */

import { createActionItem } from '@/lib/dataLayer';
import type { ActionItemRow, GoalRow, TaskRow, NotificationRow } from '@/lib/dataLayer';
import { computeAutoProgress } from '@/lib/reviewEngine';

// --- Types ---

export interface FeedbackEvent {
  type: 'approval' | 'meeting' | 'task_status' | 'doc_status';
  action: string;
  entity: Record<string, unknown>;
  goalId?: string | null;
}

// --- Core Feedback Processor ---

/**
 * Process a collab event and generate OKR feedback.
 * Returns created action items and notifications.
 */
export async function processMLOOFeedback(
  event: FeedbackEvent,
  goals: GoalRow[],
  tasks: TaskRow[],
  addNotification: (data: Omit<NotificationRow, 'id' | 'created_at' | 'read' | 'team_id'>) => void,
): Promise<{ actionItems: Partial<ActionItemRow>[]; progressUpdates: { goalId: string; newProgress: number }[] }> {
  const actionItems: Partial<ActionItemRow>[] = [];
  const progressUpdates: { goalId: string; newProgress: number }[] = [];

  switch (event.type) {
    case 'approval': {
      const approval = event.entity;
      const newStatus = approval.status as string;
      const goalId = (approval.goal_id as string) || findRelatedGoalId(approval.title as string, goals);

      if (goalId && newStatus === 'approved') {
        // Create action item: follow through on approved item
        const ai = await createActionItem({
          title: `执行审批: ${approval.title}`,
          description: `审批「${approval.title}」已通过，需要执行落实。`,
          source: 'manual',
          source_id: approval.id as string,
          goal_id: goalId,
          status: 'open',
          priority: (approval.urgency === 'urgent' ? 'high' : 'medium') as ActionItemRow['priority'],
          closed_loop: false,
        });
        actionItems.push(ai);

        addNotification({
          title: `审批通过: ${approval.title}`,
          message: `已自动生成待办事项，关联目标: ${goals.find((g) => g.id === goalId)?.title ?? '未知'}`,
          type: 'update',
          related_id: goalId,
          related_type: 'goal',
          member_id: null,
          level: 'info',
        });
      }

      if (goalId && newStatus === 'rejected') {
        addNotification({
          title: `审批驳回: ${approval.title}`,
          message: `关联目标可能受影响，建议评估是否调整计划。`,
          type: 'alert',
          related_id: goalId,
          related_type: 'goal',
          member_id: null,
          level: 'warn',
        });
      }
      break;
    }

    case 'meeting': {
      const meeting = event.entity;
      const newStatus = meeting.status as string;
      const goalId = (meeting.goal_id as string) || findRelatedGoalId(meeting.title as string, goals);

      if (newStatus === 'ended' && goalId) {
        const ai = await createActionItem({
          title: `落实会议决议: ${meeting.title}`,
          description: `会议「${meeting.title}」已结束，请跟进会议决议和行动项。`,
          source: 'manual',
          source_id: meeting.id as string,
          goal_id: goalId,
          status: 'open',
          priority: 'medium',
          closed_loop: false,
        });
        actionItems.push(ai);

        addNotification({
          title: `会议结束: ${meeting.title}`,
          message: `已自动生成待办事项，关联目标: ${goals.find((g) => g.id === goalId)?.title ?? '未知'}`,
          type: 'update',
          related_id: goalId,
          related_type: 'goal',
          member_id: null,
          level: 'info',
        });
      }
      break;
    }

    case 'task_status': {
      // Auto-recalculate goal progress when a task is completed
      const task = event.entity;
      const goalId = (task.goal_id as string) || null;

      if (goalId) {
        const autoProg = computeAutoProgress(goalId, tasks);
        if (autoProg >= 0) {
          progressUpdates.push({ goalId, newProgress: autoProg });

          addNotification({
            title: `目标进度更新`,
            message: `因任务「${task.title}」状态变更，目标进度自动调整为 ${autoProg}%`,
            type: 'update',
            related_id: goalId,
            related_type: 'goal',
            member_id: null,
            level: 'info',
          });
        }
      }

      if ((task.status as string) === 'done') {
        addNotification({
          title: `任务完成: ${task.title}`,
          message: `任务已完成${goalId ? '，关联目标进度已自动回算' : ''}。`,
          type: 'system',
          related_id: task.id as string,
          related_type: 'task',
          member_id: null,
          level: 'info',
        });
      }
      break;
    }

    case 'doc_status': {
      const doc = event.entity;
      const newStatus = doc.status as string;
      const goalId = (doc.goal_id as string) || null;

      if (newStatus === 'final' && goalId) {
        addNotification({
          title: `文档定稿: ${doc.title}`,
          message: `文档已定稿，可能标志着某交付物的完成。`,
          type: 'update',
          related_id: goalId,
          related_type: 'goal',
          member_id: null,
          level: 'info',
        });
      }
      break;
    }
  }

  return { actionItems, progressUpdates };
}

// --- Helpers ---

/**
 * Try to match an entity title to a goal by keyword overlap.
 * Simple heuristic: if >50% of title words appear in a goal title, link them.
 */
function findRelatedGoalId(title: string, goals: GoalRow[]): string | null {
  if (!title || goals.length === 0) return null;
  const titleWords = title.toLowerCase().split(/\s+/);
  for (const goal of goals) {
    const goalWords = goal.title.toLowerCase().split(/\s+/);
    const overlap = titleWords.filter((w) => w.length > 1 && goalWords.some((gw) => gw.includes(w)));
    if (overlap.length >= Math.ceil(titleWords.length * 0.5)) {
      return goal.id;
    }
  }
  return null;
}
