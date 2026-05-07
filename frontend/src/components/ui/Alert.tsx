import { ReactNode } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

type Variant = 'success' | 'warning' | 'error' | 'info';

interface Props {
  variant?: Variant;
  title?: string;
  children: ReactNode;
  onClose?: () => void;
}

const config = {
  success: { icon: CheckCircle, bg: '#f0faf2', border: '#b3e6be', text: '#1a6b2f', iconColor: '#2d8a47' },
  warning: { icon: AlertTriangle, bg: '#fffbeb', border: '#fde68a', text: '#92400e', iconColor: '#d97706' },
  error:   { icon: XCircle,       bg: '#fef2f2', border: '#fecaca', text: '#991b1b', iconColor: '#ef4444' },
  info:    { icon: Info,           bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', iconColor: '#3b82f6' },
};

export default function Alert({ variant = 'info', title, children, onClose }: Props) {
  const c = config[variant];
  const Icon = c.icon;
  return (
    <div className="flex gap-3 p-4 rounded-xl border" style={{ background: c.bg, borderColor: c.border }}>
      <Icon size={18} style={{ color: c.iconColor, flexShrink: 0, marginTop: 1 }} />
      <div className="flex-1 min-w-0">
        {title && <p className="text-sm font-semibold" style={{ color: c.text }}>{title}</p>}
        <p className="text-sm" style={{ color: c.text }}>{children}</p>
      </div>
      {onClose && (
        <button onClick={onClose} className="text-current opacity-50 hover:opacity-100 transition-opacity">
          <X size={16} />
        </button>
      )}
    </div>
  );
}
