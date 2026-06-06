/**
 * useDeviationWatch — 主动偏差推送 (S8.2)
 *
 * When goals/projects change, auto-detect deviations and push notifications
 * for NEW warn/danger alerts (deduped per page session).
 *
 * Returns current alerts for UI rendering.
 */

import { useEffect, useRef, useState } from 'react';
import { useGoals, useProjects, useNotifications } from '@/hooks/useMatrix';
import { detectDeviations, type DeviationAlert } from '@/lib/reviewEngine';

export function useDeviationWatch() {
  const { goals, loading: goalsLoading } = useGoals();
  const { projects, loading: projectsLoading } = useProjects();
  const { addNotification } = useNotifications();

  const [alerts, setAlerts] = useState<DeviationAlert[]>([]);
  // Track which alert IDs we've already pushed this session
  const pushedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (goalsLoading || projectsLoading) return;

    const items = [
      ...goals.map((g) => ({
        id: g.id, title: g.title, progress: g.progress,
        startDate: g.start_date, endDate: g.end_date, type: 'goal' as const,
      })),
      ...projects.map((p) => ({
        id: p.id, title: p.title, progress: p.progress,
        startDate: null as string | null, endDate: p.end_date, type: 'project' as const,
      })),
    ];

    const detected = detectDeviations(items);
    setAlerts(detected);

    // Push notifications for new warn/danger deviations only
    for (const alert of detected) {
      if (pushedRef.current.has(alert.id)) continue;
      if (alert.severity === 'info') continue; // Only push warn and danger

      addNotification({
        title: alert.severity === 'danger' ? '偏差告警' : '进度偏差',
        message: alert.message,
        type: alert.severity === 'danger' ? 'alert' : 'update',
        related_id: alert.targetId,
        related_type: alert.targetType,
        member_id: null,
        level: alert.severity === 'danger' ? 'warn' : 'info',
      });
      pushedRef.current.add(alert.id);
    }
  }, [goals, projects, goalsLoading, projectsLoading, addNotification]);

  return { alerts, alertCount: alerts.length };
}
