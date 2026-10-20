'use client';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const FIELDS = 'input:not([disabled]):not([readonly]):not([type=hidden]):not([type=file]),select:not([disabled]),textarea:not([disabled]):not([readonly])';

/**
 * Shared dialog for every product (POS, COD, Tasks, super admin).
 * - Rendered in a portal on <body>, so it never inherits styles or transforms from where it's opened.
 * - Focus moves in once when it opens (to the first field, never the close button) and goes back on close.
 * - Phones: full-screen sheet with a pinned header; a form's submit row sticks to the bottom (globals.css).
 */
export default function Modal({ open, onClose, title, children, width = 'max-w-lg' }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Latest onClose without re-running the effects: callers usually pass a new inline function every
  // render, and re-running the open effect on each keystroke used to pull focus to the close button.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onCloseRef.current(); return; }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      }
    };
    document.addEventListener('keydown', handler);

    // Lock the page behind the dialog
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    // Focus the first field once. On touch screens focus the dialog itself instead, so the
    // keyboard doesn't pop up and cover half the form before the user has read it.
    const t = setTimeout(() => {
      const panel = panelRef.current;
      if (!panel || panel.contains(document.activeElement)) return;
      const touch = window.matchMedia('(pointer: coarse)').matches;
      const field = touch ? null : panel.querySelector<HTMLElement>(FIELDS);
      (field ?? panel).focus({ preventScroll: true });
    }, 50);

    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = overflow;
      previous?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center sm:p-4 animate-fade-in"
      role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={() => onCloseRef.current()} />
      <div ref={panelRef} tabIndex={-1}
        className={`relative w-full ${width} h-[100dvh] sm:h-auto sm:max-h-[90vh] flex flex-col text-left bg-white sm:rounded-2xl shadow-modal animate-slide-up outline-none`}>
        <div className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 border-b border-ink-100">
          <h2 id="modal-title" className="text-base font-semibold text-ink-800 truncate">{title}</h2>
          <button type="button" onClick={() => onCloseRef.current()} aria-label="Close dialog"
            className="w-9 h-9 sm:w-8 sm:h-8 flex-shrink-0 flex items-center justify-center rounded-lg hover:bg-ink-100 text-ink-400 hover:text-ink-700 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="kh-modal-body flex-1 min-h-0 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
