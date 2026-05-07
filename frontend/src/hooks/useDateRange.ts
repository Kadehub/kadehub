'use client';
import { useState } from 'react';

export type Preset = 'today' | 'yesterday' | '7d' | '30d' | '90d' | 'custom';

function fmt(d: Date) { return d.toISOString().split('T')[0]; }

export function useDateRange() {
  const today = fmt(new Date());

  const presets: Record<Preset, { from: string; to: string; label: string }> = {
    today:     { from: today, to: today, label: 'Today' },
    yesterday: (() => { const d = new Date(); d.setDate(d.getDate() - 1); const s = fmt(d); return { from: s, to: s, label: 'Yesterday' }; })(),
    '7d':      (() => { const d = new Date(); d.setDate(d.getDate() - 6); return { from: fmt(d), to: today, label: 'Last 7 days' }; })(),
    '30d':     (() => { const d = new Date(); d.setDate(d.getDate() - 29); return { from: fmt(d), to: today, label: 'Last 30 days' }; })(),
    '90d':     (() => { const d = new Date(); d.setDate(d.getDate() - 89); return { from: fmt(d), to: today, label: 'Last 90 days' }; })(),
    custom:    { from: today, to: today, label: 'Custom' },
  };

  const [preset, setPreset] = useState<Preset>('7d');
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(today);

  const from = preset === 'custom' ? customFrom : presets[preset].from;
  const to   = preset === 'custom' ? customTo   : presets[preset].to;

  return { preset, setPreset, from, to, customFrom, setCustomFrom, customTo, setCustomTo, presets };
}
