import { useState, useEffect, useCallback } from 'react';
import { fetchPredictions, createPrediction, updatePrediction, deletePrediction, type PredictionRow } from '@/lib/dataLayer';
import type { PredictionInput } from '@/contracts/dataContracts';

export function usePredictions() {
  const [predictions, setPredictions] = useState<PredictionRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchPredictions().then((d) => { setPredictions(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const addPrediction = useCallback(async (data: Partial<PredictionRow>) => {
    const row = await createPrediction(data as PredictionInput);
    setPredictions((prev) => [row, ...prev]);
    return row;
  }, []);

  const editPrediction = useCallback(async (id: string, data: Partial<PredictionRow>) => {
    const row = await updatePrediction(id, data as PredictionInput);
    setPredictions((prev) => prev.map((p) => p.id === id ? row : p));
    return row;
  }, []);

  const removePrediction = useCallback(async (id: string) => {
    await deletePrediction(id);
    setPredictions((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { predictions, setPredictions, loading, addPrediction, editPrediction, removePrediction };
}
