import { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'amber' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'xs' | 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  loading?: boolean;
}

const base = 'inline-flex items-center justify-center gap-2 font-semibold transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 select-none';

const variants: Record<Variant, string> = {
  primary:   'kh-btn-primary',
  amber:     'kh-btn-amber',
  secondary: 'bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-lg',
  ghost:     'hover:bg-ink-100 text-ink-600 rounded-lg',
  danger:    'bg-coral hover:opacity-90 text-white rounded-lg',
  outline:   'border border-ink-200 hover:bg-ink-50 text-ink-700 rounded-lg',
};

const sizes: Record<Size, string> = {
  xs: 'px-2.5 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export default function Button({ variant = 'primary', size = 'md', icon, loading, children, className = '', ...props }: Props) {
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {loading
        ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        : icon}
      {children}
    </button>
  );
}
