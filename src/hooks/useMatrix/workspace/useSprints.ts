import { useState, useEffect, useCallback } from 'react';
import { fetchSprints, createSprint, updateSprint, deleteSprint, type SprintRow } from '@/lib/dataLayer';

export function useSprints() {
  const [sprints, setSprints] = useState<SprintRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchSprints().then((d) => { setSprints(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  const addSprint = useCallback(async (data: Omit<SprintRow, 'id' | 'created_at' | 'updated_at'>) => {
    const row = await createSprint(data);
    setSprints((prev) => [row, ...prev]);
    return row;
  }, []);
  const editSprint = useCallback(async (id: string, data: Partial<Omit<SprintRow, 'id' | 'created_at'>>) => {
    const row = await updateSprint(id, data);
    setSprints((prev) => prev.map((s) => s.id === id ? row : s));
    return row;
  }, []);
  const removeSprint = useCallback(async (id: string) => {
    const prev = sprints;
    setSprints((p) => p.filter((s) => s.id !== id));
    try { await deleteSprint(id); } catch (e) { setSprints(prev); console.warn('[useSprints] removeSprint DB failed, rolled back', e); }
  }, [sprints]);
  return { sprints, setSprints, loading, addSprint, editSprint, removeSprint };
}
