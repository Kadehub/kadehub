'use client';
import { useEffect, useRef, useState, type ElementType, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useLang } from '../../hooks/useLang';
import type { Locale } from '../../lib/i18n';

const LABELS: Record<Locale, { show: string; hide: string }> = {
  en: { show: 'Show password', hide: 'Hide password' },
  si: { show: 'මුරපදය පෙන්වන්න', hide: 'මුරපදය සඟවන්න' },
};

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** The input to render, for forms with their own field component. */
  as?: ElementType;
  /** Button labels, for apps whose language doesn't come from useLang(). */
  showLabel?: string;
  hideLabel?: string;
}

/** A password field with an eye button that shows or hides what was typed. */
export function PasswordInput({ as: Field = 'input', showLabel, hideLabel, className = '', ...props }: PasswordInputProps) {
  const { locale } = useLang();
  const [visible, setVisible] = useState(false);
  const wrapper = useRef<HTMLSpanElement>(null);

  // Mask it again on submit, so the browser never handles the password as ordinary text
  useEffect(() => {
    const form = wrapper.current?.closest('form');
    if (!form) return;
    const hide = () => setVisible(false);
    form.addEventListener('submit', hide);
    return () => form.removeEventListener('submit', hide);
  }, []);

  const label = visible ? hideLabel ?? LABELS[locale].hide : showLabel ?? LABELS[locale].show;

  return (
    // A span, because some forms put this field inside a <label>
    <span ref={wrapper} className="relative block">
      <Field
        // pr-11 keeps long passwords clear of the button; Edge's own eye would otherwise show as a second one
        className={`${className} pr-11 [&::-ms-reveal]:hidden`}
        spellCheck={false}
        autoCapitalize="none"
        autoCorrect="off"
        {...props}
        type={visible ? 'text' : 'password'}
      />
      <button
        type="button"
        aria-label={label}
        title={label}
        disabled={props.disabled}
        // Keeps the cursor in the field when clicked
        onMouseDown={e => e.preventDefault()}
        onClick={() => setVisible(v => !v)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-ink-500 transition-colors hover:text-ink-800 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink-800 disabled:opacity-50"
      >
        {visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
      </button>
    </span>
  );
}
