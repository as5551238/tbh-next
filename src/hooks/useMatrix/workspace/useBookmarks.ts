import { useState, useEffect, useCallback } from 'react';
import { fetchBookmarks, createBookmark, deleteBookmark, type BookmarkRow } from '@/lib/dataLayer';

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchBookmarks().then((d) => { setBookmarks(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  const addBookmark = useCallback(async (data: Omit<BookmarkRow, 'id' | 'created_at'>) => {
    const row = await createBookmark(data);
    setBookmarks((prev) => [row, ...prev]);
    return row;
  }, []);
  const removeBookmark = useCallback(async (id: string) => {
    const prev = bookmarks;
    setBookmarks((p) => p.filter((b) => b.id !== id));
    try { await deleteBookmark(id); } catch (e) { setBookmarks(prev); console.warn('[useBookmarks] removeBookmark DB failed, rolled back', e); }
  }, [bookmarks]);
  return { bookmarks, setBookmarks, loading, addBookmark, removeBookmark };
}
