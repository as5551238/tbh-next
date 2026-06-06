/**
 * useMLOOFeedback — React hook for the MLOO implicit closed loop.
 *
 * Provides a single `triggerFeedback(event)` function that:
 * 1. Generates ActionItems linked to goals
 * 2. Pushes notifications to the notification center
 * 3. Auto-syncs goal progress when tasks change
 *
 * Usage in View components:
 *   const { triggerFeedback } = useMLOOFeedback();
 *   // When approval is approved:
 *   await triggerFeedback({ type: 'approval', action: 'approved', entity: approvalData });
 */

import { useCallback, useRef } from 'react';
import { useGoals } from '@/hooks/useMatrix';
import { useTasks } from '@/hooks/useMatrix';
import { useNotifications } from '@/hooks/useMatrix';
import { processMLOOFeedback, type FeedbackEvent } from '@/lib/mlooFeedback';

export function useMLOOFeedback() {
  const { goals, editGoal } = useGoals();
  const { tasks } = useTasks();
  const { addNotification } = useNotifications();

  // Use ref to avoid stale closure issues
  const goalsRef = useRef(goals);
  const tasksRef = useRef(tasks);
  goalsRef.current = goals;
  tasksRef.current = tasks;

  const triggerFeedback = useCallback(async (event: FeedbackEvent) => {
    try {
      const result = await processMLOOFeedback(
        event,
        goalsRef.current,
        tasksRef.current,
        addNotification,
      );

      // Auto-sync goal progress for all affected goals
      for (const { goalId, newProgress } of result.progressUpdates) {
        const goal = goalsRef.current.find((g) => g.id === goalId);
        if (goal && goal.progress !== newProgress) {
          await editGoal(goalId, { progress: newProgress });
        }
      }

      return result;
    } catch (err) {
      console.warn('MLOO feedback error:', err);
    }
  }, [addNotification, editGoal]);

  return { triggerFeedback };
}
