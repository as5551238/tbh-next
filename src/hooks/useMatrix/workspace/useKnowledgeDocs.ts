import { useState, useEffect, useCallback } from 'react';
import { fetchKnowledgeDocs, createKnowledgeDoc, updateKnowledgeDoc, deleteDoc, type KnowledgeDocRow } from '@/lib/dataLayer';

export function useKnowledgeDocs() {
  const [docs, setDocs] = useState<KnowledgeDocRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchKnowledgeDocs().then((d) => { setDocs(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const addDoc = useCallback(async (data: Omit<KnowledgeDocRow, 'id' | 'created_at' | 'updated_at'>) => {
    const row = await createKnowledgeDoc(data);
    setDocs((prev) => [row, ...prev]);
    return row;
  }, []);

  const editDoc = useCallback(async (id: string, data: Partial<Omit<KnowledgeDocRow, 'id' | 'created_at' | 'updated_at'>>) => {
    const row = await updateKnowledgeDoc(id, data);
    setDocs((prev) => prev.map((d) => d.id === id ? row : d));
    return row;
  }, []);

  const removeDoc = useCallback(async (id: string) => {
    const prev = docs;
    setDocs((p) => p.filter((d) => d.id !== id));
    try { await deleteDoc(id); } catch (e) { setDocs(prev); console.warn('[useKnowledgeDocs] removeDoc DB failed, rolled back', e); }
  }, [docs]);

  return { docs, setDocs, loading, addDoc, editDoc, removeDoc };
}
