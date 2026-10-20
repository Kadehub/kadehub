import type { ReactNode } from 'react';

/**
 * KadeHub's capybara mascot. One source image (public/mascot/capybara.webp, transparent, 465×489);
 * width/height are always set so the image never causes layout shift.
 */
export const MASCOT_SRC = '/mascot/capybara.webp';
const RATIO = 489 / 465;

const SIZES = { xs: 36, sm: 56, md: 96, lg: 160, xl: 240 } as const;
export type MascotSize = keyof typeof SIZES;

/**
 * enter: fade/scale in once · celebrate: one small hop (success) · bob: gentle loop (loading only).
 * All are disabled under prefers-reduced-motion (globals.css).
 */
export type MascotAnimation = 'none' | 'enter' | 'celebrate' | 'bob';

interface MascotProps {
  size?: MascotSize;
  /** Exact pixel width instead of a preset size. */
  width?: number;
  animation?: MascotAnimation;
  /** Purely decorative next to text that already says everything: hidden from screen readers. */
  decorative?: boolean;
  alt?: string;
  /** Above-the-fold hero use: load eagerly. */
  priority?: boolean;
  /** Dimmed, still mascot for error states (there is no separate "concerned" artwork). */
  muted?: boolean;
  className?: string;
}

export default function Mascot({
  size = 'md', width, animation = 'none', decorative = false,
  alt = 'KadeHub capybara mascot holding a cup of tea', priority = false, muted = false, className = '',
}: MascotProps) {
  const w = width ?? SIZES[size];
  const h = Math.round(w * RATIO);
  const anim = animation === 'none' ? '' : `kh-mascot-${animation}`;
  return (
    <img
      src={MASCOT_SRC}
      width={w}
      height={h}
      alt={decorative ? '' : alt}
      aria-hidden={decorative || undefined}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      className={`select-none flex-shrink-0 ${anim} ${muted ? 'opacity-70 grayscale-[35%]' : ''} ${className}`}
      style={{ width: w, height: h }}
    />
  );
}

interface MascotStateProps {
  variant?: 'empty' | 'loading' | 'error' | 'success';
  title?: ReactNode;
  description?: ReactNode;
  /** Buttons / links rendered under the text. */
  action?: ReactNode;
  size?: MascotSize;
  className?: string;
}

/**
 * Mascot + message block for empty lists, loading, error and success screens.
 * Callers pass already-translated text; nothing here is hardcoded copy.
 */
export function MascotState({ variant = 'empty', title, description, action, size = 'md', className = '' }: MascotStateProps) {
  const animation: MascotAnimation =
    variant === 'loading' ? 'bob' : variant === 'success' ? 'celebrate' : variant === 'empty' ? 'enter' : 'none';
  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-4 py-8 ${className}`}
      role={variant === 'loading' ? 'status' : variant === 'error' ? 'alert' : undefined}
      aria-live={variant === 'loading' ? 'polite' : undefined}
    >
      <Mascot size={size} animation={animation} muted={variant === 'error'} decorative />
      {title && <p className="mt-3 text-base font-bold text-ink-800">{title}</p>}
      {description && <p className="mt-1 text-sm text-ink-400 max-w-sm">{description}</p>}
      {action && <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}
