type Variant = 'teal' | 'amber' | 'coral' | 'blue' | 'navy' | 'gray' | 'green' | 'orange' | 'red';

interface Props { children: React.ReactNode; variant?: Variant; dot?: boolean; }

const map: Record<Variant, string> = {
  teal:   'kh-badge-teal',
  amber:  'kh-badge-amber',
  coral:  'kh-badge-coral',
  blue:   'kh-badge-blue',
  navy:   'kh-badge-navy',
  gray:   'kh-badge-gray',
  // aliases
  green:  'kh-badge-teal',
  orange: 'kh-badge-amber',
  red:    'kh-badge-coral',
};

export default function Badge({ children, variant = 'gray', dot = false }: Props) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${map[variant]}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
