'use client';
import { Preset, useDateRange } from '../../hooks/useDateRange';

type Props = ReturnType<typeof useDateRange>;

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'today',     label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7d',        label: '7 Days' },
  { key: '30d',       label: '30 Days' },
  { key: '90d',       label: '90 Days' },
  { key: 'custom',    label: 'Custom' },
];

export default function DateRangePicker(props: Props) {
  const { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo } = props;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1 p-1 rounded-xl bg-white border border-ink-200">
        {PRESETS.map((p) => (
          <button key={p.key} onClick={() => setPreset(p.key)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: preset === p.key ? '#00A884' : 'transparent',
              color: preset === p.key ? 'white' : '#64748B',
            }}>
            {p.label}
          </button>
        ))}
      </div>
      {preset === 'custom' && (
        <div className="flex items-center gap-2">
          <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
            className="border border-ink-200 rounded-lg px-3 py-1.5 text-sm bg-white" />
          <span className="text-ink-400 text-sm">→</span>
          <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
            className="border border-ink-200 rounded-lg px-3 py-1.5 text-sm bg-white" />
        </div>
      )}
    </div>
  );
}
