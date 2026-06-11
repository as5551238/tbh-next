import { useState, useEffect, useCallback } from 'react';
import { fetchNotes, createNote, updateNote, deleteNote, type NoteRow } from '@/lib/dataLayer';

export function useNotes() {
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchNotes().then((d) => { setNotes(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  const addNote = useCallback(async (data: Omit<NoteRow, 'id' | 'created_at' | 'updated_at'>) => {
    const row = await createNote(data);
    setNotes((prev) => [row, ...prev]);
    return row;
  }, []);
  const editNote = useCallback(async (id: string, data: Partial<Omit<NoteRow, 'id' | 'created_at'>>) => {
    const row = await updateNote(id, data);
    setNotes((prev) => prev.map((n) => n.id === id ? row : n));
    return row;
  }, []);
  const removeNote = useCallback(async (id: string) => {
    const prev = notes;
    setNotes((p) => p.filter((n) => n.id !== id));
    try { await deleteNote(id); } catch (e) { setNotes(prev); console.warn('[useNotes] removeNote DB failed, rolled back', e); }
  }, [notes]);
  return { notes, setNotes, loading, addNote, editNote, removeNote };
}
