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

  const src = theme === 'mono' ? '/logo-mono.png' : '/logo-primary.png';

  // Use width to fill container, or height if specified
  const style: React.CSSProperties = width
    ? { width, height: 'auto', objectFit: 'contain' as const }
    : { height: height ?? 40, width: 'auto', objectFit: 'contain' as const };

  return (
    <img
      src={src}
      alt="KadeHub"
      style={style}
      className={`select-none ${className}`}
    />
  );
}
