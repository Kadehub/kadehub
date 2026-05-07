import { ReactNode } from 'react';

interface CardProps { children: ReactNode; className?: string; padding?: boolean; }
export function Card({ children, className = '', padding = true }: CardProps) {
  return <div className={`kh-card ${padding ? 'p-5' : ''} ${className}`}>{children}</div>;
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ReactNode;
  trend?: { value: string; up: boolean };
  color?: 'teal' | 'amber' | 'blue' | 'coral' | 'navy';
}

const colorMap = {
  teal:  { text: '#009688', bg: '#E0F2F1', icon: '#009688' },
  amber: { text: '#F59E0B', bg: '#FFF8E1', icon: '#FFB703' },
  blue:  { text: '#2563EB', bg: '#EFF6FF', icon: '#2563EB' },
  coral: { text: '#FF6B6B', bg: '#FFF0F0', icon: '#FF6B6B' },
  navy:  { text: '#0F172A', bg: '#F1F5F9', icon: '#334155' },
};

export function StatCard({ label, value, sub, icon, trend, color = 'teal' }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className="kh-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-ink-500 font-medium">{label}</p>
          <p className="text-2xl font-bold mt-1" style={{ color: c.text }}>{value}</p>
          {sub && <p className="text-xs text-ink-400 mt-0.5">{sub}</p>}
          {trend && (
            <p className={`text-xs font-semibold mt-1 ${trend.up ? 'text-teal' : 'text-coral'}`}>
              {trend.up ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: c.bg }}>
            <span style={{ color: c.icon }}>{icon}</span>
          </div>
        )}
      </div>
    </div>
  );
}
