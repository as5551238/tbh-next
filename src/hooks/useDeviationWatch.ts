/**
 * useDeviationWatch — 主动偏差推送 + 自动生成行动项 (S8.2 + 业务闭环)
 *
 * When goals/projects change, auto-detect deviations and:
 * 1. Push notifications for NEW warn/danger alerts
 * 2. Auto-create ActionItems for danger-level deviations (隐性闭环核心)
 *
 * Returns current alerts for UI rendering.
 */

import { useEffect, useRef, useState } from 'react';
import { useGoals, useProjects, useNotifications } from '@/hooks/useMatrix';
import { detectDeviations, type DeviationAlert } from '@/lib/reviewEngine';
import { createActionItem } from '@/lib/dataLayer';

export function useDeviationWatch() {
  const { goals, loading: goalsLoading } = useGoals();
  const { projects, loading: projectsLoading } = useProjects();
  const { addNotification } = useNotifications();

  const [alerts, setAlerts] = useState<DeviationAlert[]>([]);
  const pushedRef = useRef<Set<string>>(new Set());
  const actionCreatedRef = useRef<Set<string>>(new Set());

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

    for (const alert of detected) {
      if (pushedRef.current.has(alert.id)) continue;
      if (alert.severity === 'info') continue;

      // Push notification
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

      // 隐性闭环：danger级别偏差自动生成行动项
      if (alert.severity === 'danger' && !actionCreatedRef.current.has(alert.id)) {
        actionCreatedRef.current.add(alert.id);
        createActionItem({
          title: `紧急处理偏差: ${alert.targetTitle}`,
          description: alert.message + ` — 建议使用${alert.recommendedModel === '5whys' ? '5Whys根因分析' : alert.recommendedModel === 'pdca' ? 'PDCA流程纠偏' : 'GRAI目标复盘'}进行复盘。`,
          source: 'deviation',
          source_id: alert.targetId,
          goal_id: alert.targetType === 'goal' ? alert.targetId : null,
          priority: 'critical',
          status: 'open',
          closed_loop: false,
        }).catch(() => { /* non-blocking */ });
      }
    }
  }, [goals, projects, goalsLoading, projectsLoading, addNotification]);

  return { alerts, alertCount: alerts.length };
}
