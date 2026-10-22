import { ShoppingCart, Truck, Hammer, Users } from 'lucide-react';
import type { ProductSlug } from '../../lib/platform';

const ICONS = { pos: ShoppingCart, cod: Truck, tasks: Hammer, hr: Users } as const;

/**
 * Animated product mark: a cart that rolls (POS), a truck that drives (COD), a hammer that taps (Tasks),
 * a team that waves (Staff).
 * Plays its move every few seconds and continuously while the surrounding `.group` is hovered.
 * CSS lives in globals.css (.kh-picon*); all motion is off under prefers-reduced-motion.
 */
export default function ProductIcon({ slug, color, size = 48 }: { slug: ProductSlug; color: string; size?: number }) {
  const Icon = ICONS[slug];
  return (
    <span
      className={`kh-picon kh-picon-${slug}`}
      style={{ width: size, height: size, ['--pc' as any]: color }}
      aria-hidden
    >
      <span className="kh-picon-ring" />
      {slug === 'cod' && <span className="kh-picon-speed"><i /><i /><i /></span>}
      {slug === 'pos' && <span className="kh-picon-scan" />}
      {slug === 'tasks' && <span className="kh-picon-spark"><i /><i /><i /></span>}
      <Icon className="kh-picon-glyph" size={Math.round(size * 0.48)} strokeWidth={2.2} />
    </span>
  );
}
