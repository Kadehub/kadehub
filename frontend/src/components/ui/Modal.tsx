'use client';
import { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}

export default function Modal({ open, onClose, title, children, width = 'max-w-lg' }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      }
    };
    if (open) {
      document.addEventListener('keydown', handler);
      // Move focus into modal on open
      setTimeout(() => panelRef.current?.querySelector<HTMLElement>('button,input,select,textarea')?.focus(), 50);
    }
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={onClose} />
      <div ref={panelRef} className={`relative w-full ${width} bg-white rounded-2xl shadow-modal animate-slide-up`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100">
          <h2 id="modal-title" className="text-base font-semibold text-ink-800">{title}</h2>
          <button onClick={onClose} aria-label="Close dialog"
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-ink-100 text-ink-400 hover:text-ink-700 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
