import { useState, useEffect, useRef, useCallback, useId, Children, cloneElement, isValidElement, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.offsetParent !== null);
}

function handleTrap(container: HTMLElement, e: KeyboardEvent) {
  if (e.key !== 'Tab') return;
  const els = getFocusable(container);
  if (els.length === 0) { e.preventDefault(); return; }
  const first = els[0];
  const last = els[els.length - 1];
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
  } else {
    if (document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

/* ------------------------------------------------------------------ */
/*  Modal Component                                                    */
/* ------------------------------------------------------------------ */

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, children, width = 'max-w-md', footer }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement as HTMLElement;
    const container = ref.current!;
    if (!container) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return; }
      handleTrap(container, e);
    }
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(() => {
      const focusable = getFocusable(container);
      (focusable[0] ?? container).focus();
    });
    return () => {
      document.removeEventListener('keydown', onKey);
      triggerRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div ref={ref} role="dialog" aria-modal="true" tabIndex={-1}
        className={cn('relative z-10 w-full mx-4 rounded-2xl border border-border bg-surface shadow-2xl outline-none', width)}>
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-bold text-text">{title}</h2>
          <button onClick={onClose} aria-label="关闭对话框" className="flex h-7 w-7 items-center justify-center rounded-lg text-text-3 hover:bg-surface-2 hover:text-text transition-colors">
            <X size={15} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="border-t border-border px-5 py-3 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  useModal Hook                                                      */
/* ------------------------------------------------------------------ */

export function useModal() {
  const [open, setOpen] = useState(false);
  const openModal = useCallback(() => setOpen(true), []);
  const closeModal = useCallback(() => setOpen(false), []);
  return { open, openModal, closeModal };
}

/* ------------------------------------------------------------------ */
/*  Form Field Helpers                                                 */
/* ------------------------------------------------------------------ */

export function ModalField({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="mb-3">
      <label htmlFor={id} className="block text-[10px] font-bold uppercase tracking-wider text-text-3 mb-1">{label}</label>
      {Children.map(children, child =>
        isValidElement(child) ? cloneElement(child as React.ReactElement<Record<string, unknown>>, { id }) : child
      )}
    </div>
  );
}

export const inputCls = 'w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-text outline-none placeholder:text-text-3 focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors';

export const btnPrimary = 'rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50';

export const btnSecondary = 'rounded-lg bg-surface-2 px-4 py-2 text-xs font-semibold text-text-2 hover:bg-surface-2/80 transition-colors';
