import { useState, useEffect, useCallback } from 'react';
import { fetchGoals, createGoal, updateGoal, deleteGoal, type GoalRow } from '@/lib/dataLayer';
import { cacheGet, cacheSet, cacheDelete } from '@/lib/perfCache';

export function useGoals() {
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const cached = cacheGet<GoalRow[]>('goals');
    if (cached) {
      setGoals(cached);
      setLoading(false);
    }
    fetchGoals().then((d) => { setGoals(d); setLoading(false); cacheSet('goals', d); })
      .catch(() => setLoading(false));
  }, []);

  const addGoal = useCallback(async (data: Omit<GoalRow, 'id'>) => {
    const row = await createGoal(data);
    setGoals((prev) => [row, ...prev]);
    cacheDelete('goals');
    return row;
  }, []);

  const editGoal = useCallback(async (id: string, data: Partial<Omit<GoalRow, 'id'>>) => {
    const row = await updateGoal(id, data);
    setGoals((prev) => prev.map((g) => g.id === id ? row : g));
    cacheDelete('goals');
    return row;
  }, []);

  const removeGoal = useCallback(async (id: string) => {
    await deleteGoal(id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
    cacheDelete('goals');
  }, []);

  return { goals, setGoals, loading, addGoal, editGoal, removeGoal };
}
