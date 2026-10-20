'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { MASCOT_SRC } from './Mascot';

const CHEER_SRC = '/mascot/capybara-happy.webp';
const CHEER_MS = 1600;

interface InteractiveMascotProps {
  /** CSS width: px number or any CSS length, e.g. 'clamp(160px, 28vw, 260px)'. Height follows the image ratio. */
  width?: number | string;
  /** Already-translated lines shown in a speech bubble, one per click/tap/Enter, cycling. */
  messages?: string[];
  /** Optional already-translated line shown once per browser session shortly after the mascot appears. */
  greeting?: string;
  bubbleSide?: 'top' | 'right';
  /** Accessible name of the button, e.g. "Say hi to the KadeHub capybara". */
  label?: string;
  alt?: string;
  priority?: boolean;
  className?: string;
}

type Heart = { id: number; x: number; delay: number; scale: number };

const BUBBLE_MS = 3800;

/**
 * The capybara as a small interactive element for welcome spots (hero, login, dashboard greeting):
 * leans toward the pointer, blinks now and then, steams on hover, and hops with hearts and a
 * speech bubble when pressed. Every movement is skipped under prefers-reduced-motion; the bubble still shows.
 * Static uses (empty/loading/error states) should keep using <Mascot />.
 */
export default function InteractiveMascot({
  width = 160, messages = [], greeting, bubbleSide = 'top',
  label = 'Say hi to the KadeHub capybara', alt = 'KadeHub capybara mascot holding a cup of tea',
  priority = false, className = '',
}: InteractiveMascotProps) {
  const rootRef = useRef<HTMLButtonElement>(null);
  const followRef = useRef<HTMLDivElement>(null);
  const hopRef = useRef<HTMLDivElement>(null);
  const msgIndex = useRef(0);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout>>();
  const cheerTimer = useRef<ReturnType<typeof setTimeout>>();
  const [bubble, setBubble] = useState<string | null>(null);
  const [hearts, setHearts] = useState<Heart[]>([]);

  const reducedMotion = () =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const say = useCallback((text: string) => {
    clearTimeout(bubbleTimer.current);
    setBubble(text);
    bubbleTimer.current = setTimeout(() => setBubble(null), BUBBLE_MS);
  }, []);

  // Lean toward the pointer (fine pointers only, only while on screen). Writes CSS variables, no re-renders.
  useEffect(() => {
    const el = rootRef.current;
    const follow = followRef.current;
    if (!el || !follow || reducedMotion() || !window.matchMedia('(pointer: fine)').matches) return;
    let frame = 0;
    let visible = false;
    const onMove = (e: PointerEvent) => {
      if (!visible || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = el.getBoundingClientRect();
        const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)));
        const dy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)));
        follow.style.setProperty('--kh-rot', `${(dx * 5).toFixed(2)}deg`);
        follow.style.setProperty('--kh-mx', `${(dx * 4).toFixed(1)}px`);
        follow.style.setProperty('--kh-my', `${(dy * 3).toFixed(1)}px`);
      });
    };
    const reset = () => {
      follow.style.setProperty('--kh-rot', '0deg');
      follow.style.setProperty('--kh-mx', '0px');
      follow.style.setProperty('--kh-my', '0px');
    };
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (!visible) reset(); });
    io.observe(el);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', reset);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', reset);
    };
  }, []);

  // Occasional blink (sometimes a double blink); paused while the tab is hidden.
  useEffect(() => {
    const follow = followRef.current;
    if (!follow || reducedMotion()) return;
    let timer: ReturnType<typeof setTimeout>;
    const blinkOnce = (then?: () => void) => {
      follow.classList.add('is-blinking');
      setTimeout(() => { follow.classList.remove('is-blinking'); then?.(); }, 180);
    };
    const schedule = () => {
      timer = setTimeout(() => {
        if (document.visibilityState === 'visible') {
          blinkOnce(Math.random() < 0.25 ? () => setTimeout(() => blinkOnce(), 140) : undefined);
        }
        schedule();
      }, 3200 + Math.random() * 3800);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);

  // One greeting per session
  useEffect(() => {
    if (!greeting) return;
    const key = `kh_mascot_greeted:${greeting}`;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, '1'); } catch {}
    const t = setTimeout(() => say(greeting), 700);
    return () => clearTimeout(t);
  }, [greeting, say]);

  useEffect(() => () => { clearTimeout(bubbleTimer.current); clearTimeout(cheerTimer.current); }, []);

  const onPress = () => {
    if (messages.length) {
      say(messages[msgIndex.current % messages.length]);
      msgIndex.current += 1;
    }
    // Switch to the laughing pose for a moment (a still image, so also under reduced motion)
    const follow = followRef.current;
    if (follow) {
      follow.classList.add('is-cheering');
      clearTimeout(cheerTimer.current);
      cheerTimer.current = setTimeout(() => follow.classList.remove('is-cheering'), CHEER_MS);
    }
    if (reducedMotion()) return;
    const hop = hopRef.current;
    if (hop) {
      hop.classList.remove('is-hopping');
      void hop.offsetWidth; // restart the animation on rapid presses
      hop.classList.add('is-hopping');
    }
    const burst: Heart[] = Array.from({ length: 4 }, (_, i) => ({
      id: Date.now() + i, x: 30 + Math.random() * 40, delay: i * 70, scale: 0.7 + Math.random() * 0.5,
    }));
    setHearts(h => [...h, ...burst]);
    setTimeout(() => setHearts(h => h.filter(x => !burst.includes(x))), 1400);
  };

  return (
    <button
      ref={rootRef}
      type="button"
      onClick={onPress}
      aria-label={label}
      className={`kh-imascot relative inline-block flex-shrink-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 ${className}`}
      style={{ width }}
    >
      <div className="kh-imascot-lift">
        <div ref={followRef} className="kh-imascot-follow">
          <div ref={hopRef} className="kh-imascot-hop" onAnimationEnd={e => e.currentTarget.classList.remove('is-hopping')}>
            <img
              src={MASCOT_SRC}
              width={465}
              height={489}
              alt={alt}
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
              draggable={false}
              className="kh-imascot-main block w-full h-auto select-none pointer-events-none"
            />
            {/* Preloaded (lazy would delay the first press); same box, aligned to the bottom */}
            <img src={CHEER_SRC} alt="" aria-hidden width={284} height={368} decoding="async" draggable={false}
              className="kh-imascot-alt select-none" />
            <span className="kh-mascot-lid kh-mascot-lid-l" aria-hidden />
            <span className="kh-mascot-lid kh-mascot-lid-r" aria-hidden />
            <span className="kh-mascot-steam" style={{ left: '47%' }} aria-hidden />
            <span className="kh-mascot-steam" style={{ left: '54%', animationDelay: '0.5s' }} aria-hidden />
          </div>
        </div>
      </div>

      {hearts.map(h => (
        <svg key={h.id} className="kh-mascot-heart" viewBox="0 0 24 24" aria-hidden
          style={{ left: `${h.x}%`, animationDelay: `${h.delay}ms`, ['--kh-s' as any]: h.scale }}>
          <path fill="#E0645A" d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.9 4.5 6.6 4.5c2.1 0 3.5 1.1 4.4 2.4.9-1.3 2.3-2.4 4.4-2.4 3.7 0 5.7 3.9 4.2 7.3C19.5 16.4 12 21 12 21z" />
        </svg>
      ))}

      <span className={`kh-mascot-bubble kh-mascot-bubble-${bubbleSide} ${bubble ? 'is-visible' : ''}`} role="status" aria-live="polite">
        {bubble}
      </span>
    </button>
  );
}
