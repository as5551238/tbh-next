/**
 * MLOO-Lite Feedback Module — 协作回流到OKR（业务闭环核心）
 *
 * When business events happen (approval, meeting, task status, goal progress change,
 * risk creation, KR update), this module auto-generates:
 * 1. ActionItems linked to goals
 * 2. Notifications to goal owners
 * 3. Auto-sync goal progress from task completion
 * 4. Auto-create action items for dangerous deviations
 *
 * Expanded from 4 event types to 7 — covering the full business loop.
 */

import { createActionItem } from '@/lib/dataLayer';
import type { ActionItemRow, GoalRow, TaskRow, NotificationRow, RiskRow } from '@/lib/dataLayer';
import { computeAutoProgress } from '@/lib/reviewEngine';

// --- Types ---

export interface FeedbackEvent {
  type: 'approval' | 'meeting' | 'task_status' | 'doc_status' | 'goal_progress' | 'risk_created' | 'kr_updated';
  action: string;
  entity: Record<string, unknown>;
  goalId?: string | null;
}

// --- Core Feedback Processor ---

/**
 * Process a business event and generate OKR feedback.
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

          // 隐性闭环：当目标进度达到100%时自动通知+检测
          if (autoProg >= 100) {
            addNotification({
              title: `目标达成!`,
              message: `所有关联任务已完成，目标进度已自动达到100%。建议发起复盘。`,
              type: 'update',
              related_id: goalId,
              related_type: 'goal',
              member_id: null,
              level: 'info',
            });
          }
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

    // --- 新增事件类型 ---

    case 'goal_progress': {
      // 目标进度手工变更 — 触发偏差检测联动
      const goal = event.entity;
      const newProgress = goal.progress as number;
      const goalId = goal.id as string;

      addNotification({
        title: `目标进度更新: ${goal.title}`,
        message: `「${goal.title}」进度已更新为 ${newProgress}%`,
        type: 'update',
        related_id: goalId,
        related_type: 'goal',
        member_id: null,
        level: 'info',
      });

      // 目标100%完成时自动建议复盘
      if (newProgress >= 100) {
        const ai = await createActionItem({
          title: `发起目标复盘: ${goal.title}`,
          description: `目标已达成，建议使用GRAI框架进行复盘，沉淀经验。`,
          source: 'review',
          source_id: goalId,
          goal_id: goalId,
          status: 'open',
          priority: 'medium',
          closed_loop: false,
        });
        actionItems.push(ai);
      }
      break;
    }

    case 'risk_created': {
      // 风险创建 — 自动关联受影响目标并建议行动
      const risk = event.entity as Partial<RiskRow>;
      const goalId = risk.affected_kpi || null;

      if (goalId) {
        const ai = await createActionItem({
          title: `风险应对: ${risk.title}`,
          description: `风险「${risk.title}」已识别（级别: ${risk.level}），需制定应对措施。`,
          source: 'deviation',
          source_id: risk.id as string,
          goal_id: goalId,
          status: 'open',
          priority: risk.level === 'critical' ? 'critical' : risk.level === 'high' ? 'high' : 'medium',
          closed_loop: false,
        });
        actionItems.push(ai);
      }

      addNotification({
        title: `新风险: ${risk.title}`,
        message: `级别: ${risk.level}。${goalId ? '已自动生成行动项。' : '建议评估受影响目标。'}`,
        type: 'alert',
        related_id: risk.id as string,
        related_type: 'risk',
        member_id: null,
        level: risk.level === 'critical' ? 'warn' : 'info',
      });
      break;
    }

    case 'kr_updated': {
      // KR更新 — 检查目标整体进度
      const kr = event.entity;
      const goalId = (kr.goal_id as string) || null;

      if (goalId) {
        const goal = goals.find((g) => g.id === goalId);
        if (goal) {
          addNotification({
            title: `KR更新: ${kr.title ?? '关键结果'}`,
            message: `「${goal.title}」的KR已更新，请关注目标整体进度。`,
            type: 'update',
            related_id: goalId,
            related_type: 'goal',
            member_id: null,
            level: 'info',
          });
        }
      }
      break;
    }
  }

  return { actionItems, progressUpdates };
}

// --- Helpers ---

/**
 * Try to match an entity title to a goal by keyword overlap.
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
