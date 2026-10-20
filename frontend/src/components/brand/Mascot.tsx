import type { ReactNode } from 'react';

/**
 * KadeHub's capybara mascot. Artwork lives in public/mascot:
 * - poses: transparent cut-outs of the character (default = holding a cup of tea)
 * - scenes: the character with its own background, shown as a rounded card
 * width/height are always set so images never cause layout shift.
 */
export const MASCOT_SRC = '/mascot/capybara.webp';

const POSES = {
  default:   { src: MASCOT_SRC,                        w: 465, h: 489, alt: 'KadeHub capybara mascot holding a cup of tea' },
  happy:     { src: '/mascot/capybara-happy.webp',     w: 284, h: 368, alt: 'KadeHub capybara laughing with a cup of tea' },
  celebrate: { src: '/mascot/capybara-celebrate.webp', w: 287, h: 383, alt: 'KadeHub capybara celebrating with confetti' },
  love:      { src: '/mascot/capybara-love.webp',      w: 256, h: 332, alt: 'KadeHub capybara holding a heart' },
  curious:   { src: '/mascot/capybara-curious.webp',   w: 287, h: 381, alt: 'KadeHub capybara peeking in with a question mark' },
} as const;
export type MascotPose = keyof typeof POSES;

const SCENES = {
  work:  { src: '/mascot/scene-work.webp',  w: 300, h: 387, alt: 'KadeHub capybara working on a laptop with headphones' },
  sleep: { src: '/mascot/scene-sleep.webp', w: 300, h: 410, alt: 'KadeHub capybara napping with a little bird on its head' },
  relax: { src: '/mascot/scene-relax.webp', w: 303, h: 329, alt: 'KadeHub capybara relaxing on the beach' },
  grow:  { src: '/mascot/scene-grow.webp',  w: 306, h: 418, alt: 'KadeHub capybara holding a small sprout' },
} as const;
export type MascotSceneName = keyof typeof SCENES;

const SIZES = { xs: 36, sm: 56, md: 96, lg: 160, xl: 240 } as const;
const SCENE_SIZES = { xs: 48, sm: 80, md: 120, lg: 170, xl: 230 } as const;
export type MascotSize = keyof typeof SIZES;

/**
 * enter: fade/scale in once · celebrate: one small hop (success) · bob: gentle loop (loading only).
 * All are disabled under prefers-reduced-motion (globals.css).
 */
export type MascotAnimation = 'none' | 'enter' | 'celebrate' | 'bob';

interface MascotProps {
  pose?: MascotPose;
  size?: MascotSize;
  /** Exact pixel width instead of a preset size. */
  width?: number;
  animation?: MascotAnimation;
  /** Purely decorative next to text that already says everything: hidden from screen readers. */
  decorative?: boolean;
  alt?: string;
  /** Above-the-fold hero use: load eagerly. */
  priority?: boolean;
  /** Dimmed and still. */
  muted?: boolean;
  className?: string;
}

export default function Mascot({
  pose = 'default', size = 'md', width, animation = 'none', decorative = false,
  alt, priority = false, muted = false, className = '',
}: MascotProps) {
  const art = POSES[pose];
  const w = width ?? SIZES[size];
  const h = Math.round(w * (art.h / art.w));
  const anim = animation === 'none' ? '' : `kh-mascot-${animation}`;
  return (
    <img
      src={art.src}
      width={w}
      height={h}
      alt={decorative ? '' : alt ?? art.alt}
      aria-hidden={decorative || undefined}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      className={`select-none flex-shrink-0 ${pose === 'curious' ? 'kh-mascot-peek' : ''} ${anim} ${muted ? 'opacity-70 grayscale-[35%]' : ''} ${className}`}
      style={{ width: w, height: h }}
    />
  );
}

interface MascotSceneProps {
  scene: MascotSceneName;
  size?: MascotSize;
  width?: number;
  animation?: MascotAnimation;
  decorative?: boolean;
  alt?: string;
  priority?: boolean;
  className?: string;
}

/** The mascot in one of its illustrated scenes, as a rounded card. */
export function MascotScene({
  scene, size = 'md', width, animation = 'none', decorative = false, alt, priority = false, className = '',
}: MascotSceneProps) {
  const art = SCENES[scene];
  const w = width ?? SCENE_SIZES[size];
  const h = Math.round(w * (art.h / art.w));
  const anim = animation === 'none' ? '' : `kh-mascot-${animation}`;
  return (
    <img
      src={art.src}
      width={w}
      height={h}
      alt={decorative ? '' : alt ?? art.alt}
      aria-hidden={decorative || undefined}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      className={`select-none flex-shrink-0 rounded-2xl shadow-sm ring-1 ring-black/5 object-cover ${anim} ${className}`}
      style={{ width: w, height: h }}
    />
  );
}

type StateVariant = 'empty' | 'loading' | 'error' | 'success';

/** Default artwork per state: loading → working at the laptop, error → peeking with a "?", success → confetti. */
const STATE_ART: Record<StateVariant, { pose?: MascotPose; scene?: MascotSceneName }> = {
  empty:   { pose: 'default' },
  loading: { scene: 'work' },
  error:   { pose: 'curious' },
  success: { pose: 'celebrate' },
};

interface MascotStateProps {
  variant?: StateVariant;
  title?: ReactNode;
  description?: ReactNode;
  /** Buttons / links rendered under the text. */
  action?: ReactNode;
  size?: MascotSize;
  /** Override the variant's default artwork with a pose… */
  pose?: MascotPose;
  /** …or with a scene card (e.g. 'sleep' for an empty inbox, 'relax' for "all caught up"). */
  scene?: MascotSceneName;
  className?: string;
}

/**
 * Mascot + message block for empty lists, loading, error and success screens.
 * Callers pass already-translated text; nothing here is hardcoded copy.
 */
export function MascotState({
  variant = 'empty', title, description, action, size = 'md', pose, scene, className = '',
}: MascotStateProps) {
  const animation: MascotAnimation =
    variant === 'loading' ? 'bob' : variant === 'success' ? 'celebrate' : 'enter';
  const art = pose || scene ? { pose, scene } : STATE_ART[variant];
  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-4 py-8 ${className}`}
      role={variant === 'loading' ? 'status' : variant === 'error' ? 'alert' : undefined}
      aria-live={variant === 'loading' ? 'polite' : undefined}
    >
      {art.scene
        ? <MascotScene scene={art.scene} size={size} animation={animation} decorative />
        : <Mascot pose={art.pose} size={size} animation={animation} decorative />}
      {title && <p className="mt-3 text-base font-bold text-ink-800">{title}</p>}
      {description && <p className="mt-1 text-sm text-ink-400 max-w-sm">{description}</p>}
      {action && <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}
