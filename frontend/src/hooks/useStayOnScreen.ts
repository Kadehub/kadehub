'use client';
import { useLayoutEffect, useRef } from 'react';

/**
 * For a popup anchored to a button (menu, picker): while `open`, nudges it sideways so it stays
 * at least `margin` px inside the screen. Uses the CSS `translate` property, so it adds to any
 * Tailwind `-translate-x-*` already on the element.
 */
export function useStayOnScreen<T extends HTMLElement>(open: boolean, margin = 8) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!open || !el) return;
    const fit = () => {
      el.style.translate = '';
      const r = el.getBoundingClientRect();
      const width = document.documentElement.clientWidth;
      let dx = 0;
      if (r.right > width - margin) dx = width - margin - r.right;
      if (r.left + dx < margin) dx = margin - r.left;
      if (dx) el.style.translate = `${dx}px 0`;
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [open, margin]);
  return ref;
}
