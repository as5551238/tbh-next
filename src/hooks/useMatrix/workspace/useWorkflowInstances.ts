import { useState, useEffect, useCallback } from 'react';
import { fetchWorkflowInstances, createWorkflowInstance, updateWorkflowInstance, deleteWorkflowInstance, type WorkflowInstanceRow } from '@/lib/dataLayer';
import type { WorkflowInstanceInput } from '@/contracts/dataContracts';

export function useWorkflowInstances() {
  const [instances, setInstances] = useState<WorkflowInstanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkflowInstances().then((rows) => { setInstances(rows || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const addInstance = useCallback(async (data: WorkflowInstanceInput) => {
    const row = await createWorkflowInstance(data);
    setInstances((prev) => [...prev, row]);
    return row;
  }, []);

  const editInstance = useCallback(async (id: string, data: WorkflowInstanceInput) => {
    const prev = instances;
    setInstances((p) => p.map((w) => w.id === id ? { ...w, ...data } as WorkflowInstanceRow : w));
    try { await updateWorkflowInstance(id, data); } catch (e) { setInstances(prev); console.warn('[useWorkflowInstances] editInstance DB failed, rolled back', e); }
  }, [instances]);

  const removeInstance = useCallback(async (id: string) => {
    const prev = instances;
    setInstances((p) => p.filter((w) => w.id !== id));
    try { await deleteWorkflowInstance(id); } catch (e) { setInstances(prev); console.warn('[useWorkflowInstances] removeInstance DB failed, rolled back', e); }
  }, [instances]);

  return { instances, setInstances, loading, addInstance, editInstance, removeInstance };
}
