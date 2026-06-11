import { useState, useCallback, useEffect } from 'react';
import { detectDeviations, computeAutoProgress } from '@/lib/reviewEngine';
import { fetchDeviationAlerts, createDeviationAlert, updateDeviationAlert, type DeviationAlertRow } from '@/lib/dataLayer';
import type { DeviationAlert } from '@/lib/reviewEngine';

export function useReviewAlerts(
  goals: { id: string; title: string; progress: number; start_date?: string; end_date?: string }[],
  tasks: { goal_id?: string; status: string; progress?: number }[],
  goalsLoading: boolean,
) {
  const [alerts, setAlerts] = useState<DeviationAlert[]>([]);
  const [persistedAlerts, setPersistedAlerts] = useState<DeviationAlertRow[]>([]);

  // 计算偏差
  const computeAlerts = useCallback(() => {
    const goalItems = goals.map((g) => ({
      id: g.id, title: g.title, progress: g.progress,
      startDate: g.start_date, endDate: g.end_date, type: 'goal' as const,
    }));
    const allAlerts = detectDeviations(goalItems);
    setAlerts(allAlerts);
  }, [goals]);

  // mount 时自动计算偏差
  useEffect(() => {
    if (!goalsLoading) computeAlerts();
  }, [goalsLoading, computeAlerts]);

  // 持久化：同步内存告警到 DB
  useEffect(() => {
    if (alerts.length === 0) return;
    const syncAlerts = async () => {
      const existing = await fetchDeviationAlerts(true);
      setPersistedAlerts(existing);
      for (const alert of alerts) {
        const alreadyExists = existing.some(
          (ea) => ea.goal_id === alert.targetId && ea.alert_type === alert.id && !ea.is_resolved
        );
        if (!alreadyExists && alert.targetId) {
          try {
            const created = await createDeviationAlert({
              goal_id: alert.targetId,
              task_id: null,
              alert_type: alert.id,
              severity: alert.severity === 'danger' ? 'critical' : alert.severity === 'warn' ? 'warning' : 'info',
              message: alert.message,
              is_read: false,
              is_resolved: false,
              resolved_at: null,
              action_item_id: null,
              team_id: '__default__',
            });
            setPersistedAlerts((prev) => [created, ...prev]);
          } catch {
            // Silently skip if RLS blocks insert
          }
        }
      }
    };
    syncAlerts();
  }, [alerts]);

  // 自动推算进度
  const autoProgressMap = useCallback(() => {
    const map: Record<string, number> = {};
    for (const g of goals) {
      const auto = computeAutoProgress(g.id, tasks);
      if (auto >= 0) map[g.id] = auto;
    }
    return map;
  }, [goals, tasks]);

  // 标记已读
  const markAlertRead = useCallback(async (alert: DeviationAlert) => {
    const match = persistedAlerts.find((pa) => pa.goal_id === alert.targetId && pa.alert_type === alert.id);
    if (match) {
      try {
        await updateDeviationAlert(match.id, { ...match, is_read: true });
        setPersistedAlerts((prev) => prev.map((pa) => pa.id === match.id ? { ...pa, is_read: true } : pa));
      } catch { /* ignore */ }
    }
  }, [persistedAlerts]);

  return { alerts, persistedAlerts, autoProgressMap, computeAlerts, markAlertRead };
}
