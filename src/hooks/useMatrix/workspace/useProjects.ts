import { useState, useEffect, useCallback } from 'react';
import { fetchProjects, createProject, updateProject, deleteProject, type ProjectRow } from '@/lib/dataLayer';

export function useProjects() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchProjects().then((d) => { setProjects(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const addProject = useCallback(async (data: Omit<ProjectRow, 'id'>) => {
    const row = await createProject(data);
    setProjects((prev) => [row, ...prev]);
    return row;
  }, []);

  const editProject = useCallback(async (id: string, data: Partial<Omit<ProjectRow, 'id'>>) => {
    const row = await updateProject(id, data);
    setProjects((prev) => prev.map((p) => p.id === id ? row : p));
    return row;
  }, []);

  const removeProject = useCallback(async (id: string) => {
    await deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { projects, setProjects, loading, addProject, editProject, removeProject };
}
