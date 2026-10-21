interface Props {
  height?: number;
  width?: number;
  variant?: 'full' | 'icon';
  theme?: 'color' | 'white' | 'mono';
  className?: string;
}

export default function KadeHubLogo({ height, width, variant = 'full', theme = 'color', className = '' }: Props) {
  if (variant === 'icon') {
    const sz = height ?? width ?? 40;
    return (
      <img
        src="/logo-icon.png"
        alt="KadeHub"
        style={{ height: sz, width: sz, objectFit: 'contain' }}
        className={`select-none ${className}`}
      />
    );
  }

  const name = theme === 'mono' ? 'logo-mono' : 'logo-primary';
  // Intrinsic size of the 400px WebP; lets the browser reserve the box before the image arrives
  const [iw, ih] = theme === 'mono' ? [400, 218] : [400, 203];

  // Use width to fill container, or height if specified
  const style: React.CSSProperties = width
    ? { width, height: 'auto', objectFit: 'contain' as const }
    : { height: height ?? 40, width: 'auto', objectFit: 'contain' as const };

  return (
    <picture>
      <source srcSet={`/${name}.webp`} type="image/webp" />
      <img
        src={`/${name}.png`}
        width={iw}
        height={ih}
        alt="KadeHub"
        style={style}
        className={`select-none ${className}`}
      />
    </picture>
  );
}
