'use client';
import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Fades/slides its content in the first time it scrolls into view and sets `.is-in`,
 * which nested animations (e.g. the landing page mock-ups) key off. Without JS or with
 * reduced motion the content is simply visible (globals.css .kh-reveal).
 */
export default function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { el.classList.add('is-in'); io.disconnect(); }
    }, { rootMargin: '0px 0px -10% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`kh-reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
