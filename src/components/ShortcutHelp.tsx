import { useState, useEffect, useCallback } from 'react';

const SHORTCUTS = [
  { keys: ['Ctrl', 'N'], description: '新建任务' },
  { keys: ['Ctrl', 'G'], description: '工作台概览' },
  { keys: ['Ctrl', 'K'], description: 'AI 对话' },
  { keys: ['Ctrl', '⇧', 'N'], description: '新建目标' },
  { keys: ['Ctrl', '⇧', 'P'], description: '订阅管理' },
  { keys: ['Ctrl', '/'], description: '快捷键帮助' },
  { keys: ['/'], description: '快捷键帮助' },
  { keys: ['Esc'], description: '关闭弹窗' },
];

export default function ShortcutHelp() {
  const [open, setOpen] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ctrl+/ or just /
    if ((e.ctrlKey && e.key === '/') || (!e.ctrlKey && !e.altKey && !e.metaKey && e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement))) {
      e.preventDefault();
      setOpen((v) => !v);
    }
    if (e.key === 'Escape') {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="快捷键帮助"
        className="w-full max-w-md rounded-2xl border border-border bg-surface-3 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-text">键盘快捷键</h2>
          <button onClick={() => setOpen(false)} className="text-text-3 hover:text-text text-sm" aria-label="关闭">✕</button>
        </div>
        <div className="space-y-2">
          {SHORTCUTS.map((s) => (
            <div key={s.keys.join('+')} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-text-2">{s.description}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((key, i) => (
                  <span key={i}>
                    <kbd className="rounded-md border border-border bg-surface px-2 py-0.5 text-[11px] font-mono text-text-3 shadow-sm">
                      {key}
                    </kbd>
                    {i < s.keys.length - 1 && <span className="text-text-3 text-xs mx-0.5">+</span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] text-text-3 text-center">按 Esc 或点击外部关闭</p>
      </div>
    </div>
  );
}
