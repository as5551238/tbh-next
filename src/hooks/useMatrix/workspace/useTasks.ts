import { useState, useEffect, useCallback } from 'react';
import { fetchTasks, createTask, updateTask, deleteTask, type TaskRow } from '@/lib/dataLayer';
import { cacheGet, cacheSet, cacheDelete } from '@/lib/perfCache';

export function useTasks() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const cached = cacheGet<TaskRow[]>('tasks');
    if (cached) {
      setTasks(cached);
      setLoading(false);
    }
    fetchTasks().then((d) => { setTasks(d); setLoading(false); cacheSet('tasks', d); })
      .catch(() => setLoading(false));
  }, []);

  const addTask = useCallback(async (data: Omit<TaskRow, 'id'>) => {
    const row = await createTask(data);
    setTasks((prev) => [row, ...prev]);
    cacheDelete('tasks');
    return row;
  }, []);

  const editTask = useCallback(async (id: string, data: Partial<Omit<TaskRow, 'id'>>) => {
    const row = await updateTask(id, data);
    setTasks((prev) => prev.map((t) => t.id === id ? row : t));
    cacheDelete('tasks');
    return row;
  }, []);

  const removeTask = useCallback(async (id: string) => {
    await deleteTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    cacheDelete('tasks');
  }, []);

  return { tasks, setTasks, loading, addTask, editTask, removeTask };
}
