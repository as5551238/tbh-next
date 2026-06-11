import { useState, useEffect, useCallback } from 'react';
import { fetchInsights, createInsight, updateInsight, deleteInsight, type InsightRow } from '@/lib/dataLayer';
import type { InsightInput } from '@/contracts/dataContracts';

export function useInsights() {
  const [insights, setInsights] = useState<InsightRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInsights().then((rows) => { setInsights(rows || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const addInsight = useCallback(async (data: InsightInput) => {
    const row = await createInsight(data);
    setInsights((prev) => [row, ...prev]);
    return row;
  }, []);

  const editInsight = useCallback(async (id: string, data: InsightInput) => {
    const prev = insights;
    setInsights((p) => p.map((i) => i.id === id ? { ...i, ...data } : i));
    try { await updateInsight(id, data); } catch (e) { setInsights(prev); console.warn('[useInsights] editInsight DB failed, rolled back', e); }
  }, [insights]);

  const removeInsight = useCallback(async (id: string) => {
    const prev = insights;
    setInsights((p) => p.filter((i) => i.id !== id));
    try { await deleteInsight(id); } catch (e) { setInsights(prev); console.warn('[useInsights] removeInsight DB failed, rolled back', e); }
  }, [insights]);

  return { insights, setInsights, loading, addInsight, editInsight, removeInsight };
}
