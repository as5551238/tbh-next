import { useState, useCallback, useRef } from 'react';

export interface ToastMsg {
  id: number;
  text: string;
  type: 'success' | 'error';
}

let _nextId = 0;

/**
 * Shared toast hook with stacking support.
 * Multiple toasts stack vertically without overlapping.
 */
export function useToast() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const show = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    const id = ++_nextId;
    setToasts((prev) => [...prev, { id, text, type }]);
    const t = setTimeout(() => {
      setToasts((prev) => prev.filter((m) => m.id !== id));
      timers.current.delete(id);
    }, 2500);
    timers.current.set(id, t);
  }, []);

  const success = useCallback((text: string) => show(text, 'success'), [show]);
  const error = useCallback((text: string) => show(text, 'error'), [show]);

  return { toasts, success, error };
}

/**
 * Toast overlay component — render inside your page.
 * Toasts stack from top-right with 8px gap.
 */
export function ToastOverlay({ toasts }: { toasts: ToastMsg[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white shadow-xl transition-all ${t.type === 'error' ? 'bg-danger/90' : 'bg-success/90'}`}>
          <span className="text-sm">{t.type === 'error' ? '✕' : '✓'}</span>
          {t.text}
        </div>
      ))}
    </div>
  );
}
