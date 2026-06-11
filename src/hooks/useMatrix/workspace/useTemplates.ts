import { useState, useEffect, useCallback } from 'react';
import { fetchTemplates, createTemplate, updateTemplate, deleteTemplate, type TemplateRow } from '@/lib/dataLayer';

export function useTemplates() {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchTemplates().then((d) => { setTemplates(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  const addTemplate = useCallback(async (data: Omit<TemplateRow, 'id' | 'created_at' | 'updated_at'>) => {
    const row = await createTemplate(data);
    setTemplates((prev) => [row, ...prev]);
    return row;
  }, []);
  const editTemplate = useCallback(async (id: string, data: Partial<Omit<TemplateRow, 'id' | 'created_at'>>) => {
    const row = await updateTemplate(id, data);
    setTemplates((prev) => prev.map((t) => t.id === id ? row : t));
    return row;
  }, []);
  const removeTemplate = useCallback(async (id: string) => {
    const prev = templates;
    setTemplates((p) => p.filter((t) => t.id !== id));
    try { await deleteTemplate(id); } catch (e) { setTemplates(prev); console.warn('[useTemplates] removeTemplate DB failed, rolled back', e); }
  }, [templates]);
  return { templates, setTemplates, loading, addTemplate, editTemplate, removeTemplate };
}
