import { useState, useEffect, useCallback } from 'react';
import { fetchExperiences, createExperience, updateExperience, deleteExperience, type ExperienceRow } from '@/lib/dataLayer';
import type { ExperienceInput } from '@/contracts/dataContracts';

export function useExperiences() {
  const [experiences, setExperiences] = useState<ExperienceRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchExperiences().then((d) => { setExperiences(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const addExperience = useCallback(async (data: Partial<ExperienceRow>) => {
    const row = await createExperience(data as ExperienceInput);
    setExperiences((prev) => [row, ...prev]);
    return row;
  }, []);

  const editExperience = useCallback(async (id: string, data: Partial<ExperienceRow>) => {
    const row = await updateExperience(id, data as ExperienceInput);
    setExperiences((prev) => prev.map((e) => e.id === id ? row : e));
    return row;
  }, []);

  const removeExperience = useCallback(async (id: string) => {
    await deleteExperience(id);
    setExperiences((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { experiences, setExperiences, loading, addExperience, editExperience, removeExperience };
}
