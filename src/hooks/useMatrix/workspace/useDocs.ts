import { useState, useEffect, useCallback } from 'react';
import { fetchDocs, createDoc, updateDoc, deleteDoc, type DocRow } from '@/lib/dataLayer';
import type { DocInput } from '@/contracts/dataContracts';

export function useDocs() {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchDocs().then((d) => { setDocs(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const addDoc = useCallback(async (data: Partial<DocRow>) => {
    const tempId = `wsdoc-${Date.now()}`;
    const tempRow = { id: tempId, ...data } as DocRow;
    setDocs((prev) => [tempRow, ...prev]);
    const dbRow = await createDoc(data as DocInput);
    if (dbRow) {
      setDocs((prev) => prev.map((d) => d.id === tempId ? dbRow as DocRow : d));
    }
    return (dbRow as DocRow) ?? tempRow;
  }, []);

  const editDoc = useCallback(async (id: string, data: Partial<DocRow>) => {
    const prev = docs;
    setDocs((p) => p.map((d) => d.id === id ? { ...d, ...data } : d));
    try { await updateDoc(id, data as DocInput); } catch (e) { setDocs(prev); console.warn('[useDocs] editDoc DB failed, rolled back', e); }
  }, [docs]);

  const removeDoc = useCallback(async (id: string) => {
    const prev = docs;
    setDocs((p) => p.filter((d) => d.id !== id));
    try { await deleteDoc(id); } catch (e) { setDocs(prev); console.warn('[useDocs] removeDoc DB failed, rolled back', e); }
  }, [docs]);

  return { docs, setDocs, loading, addDoc, editDoc, removeDoc };
}
