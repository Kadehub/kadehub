import { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export function Input({ label, error, icon, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-ink-700">{label}</label>}
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">{icon}</span>}
        <input
          className={`w-full border border-ink-200 rounded-lg bg-white text-ink-800 placeholder:text-ink-400 text-sm transition-all ${icon ? 'pl-9' : 'px-3'} py-2.5 ${error ? 'border-red-400' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: ReactNode;
}

export function Select({ label, children, className = '', ...props }: SelectProps) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-ink-700">{label}</label>}
      <select className={`w-full border border-ink-200 rounded-lg bg-white text-ink-800 text-sm px-3 py-2.5 transition-all ${className}`} {...props}>
        {children}
      </select>
    </div>
  );
}
