'use client';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../../lib/api';
import { BASE, Loading, errorMessage, when } from './shared';

const pct = (v: number | null) => (v === null || v === undefined ? '—' : `${Math.round(v * 100)}%`);

const Tile = ({ label, value, hint }: { label: string; value: string | number; hint?: string }) => (
  <div className="kh-card p-4">
    <p className="text-xs font-semibold text-ink-500">{label}</p>
    <p className="text-2xl font-bold text-ink-900 mt-1">{value}</p>
    {hint && <p className="text-xs text-ink-400 mt-0.5">{hint}</p>}
  </div>
);

export default function Analytics() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.get(`${BASE}/analytics`).then(r => setData(r.data)).catch(err => toast.error(errorMessage(err, 'Could not load analytics')));
  }, []);

  if (!data) return <Loading />;
  const spendRatio = data.ai_budget_usd > 0 ? Math.min(1, data.ai_spend_usd / data.ai_budget_usd) : 1;
  const workerAgeMin = data.worker_last_run ? (Date.now() - new Date(data.worker_last_run).getTime()) / 60000 : null;
  const workerLate = workerAgeMin === null || workerAgeMin > 5;

  return (
    <div className="space-y-5">
      <p className="text-sm text-ink-500">Last {data.window_days} days, unless it says otherwise.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile label="Response rate" value={pct(data.response_rate)} hint={`${data.replied} of ${data.contacted} prospects, all time`} />
        <Tile label="Bounce rate" value={pct(data.bounce_rate)} hint={`${data.bounced} of ${data.sent} sent`} />
        <Tile label="Opt-out rate" value={pct(data.opt_out_rate)} hint={`${data.opt_outs} of ${data.sent} sent`} />
        <Tile label="Approval rate" value={pct(data.approval_rate)} hint={`${data.approved} approved, ${data.rejected} rejected`} />
        <Tile label="Mail received" value={data.received} />
        <Tile label="Sent" value={data.sent} />
        <Tile label="Sent today" value={`${data.sent_today} of ${data.daily_limit}`} hint="Daily limit" />
        <Tile label="Queue" value={data.queue.queued ?? 0} hint={`${data.queue.running ?? 0} running, ${data.queue.dead ?? 0} failed`} />
      </div>

      <div className="kh-card p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-semibold text-ink-800">AI cost this month</h3>
          <p className="text-sm text-ink-700">USD {data.ai_spend_usd.toFixed(2)} of {Number(data.ai_budget_usd).toFixed(2)}</p>
        </div>
        <div className="h-2 rounded-full bg-ink-100 mt-3 overflow-hidden" role="meter" aria-label="AI budget used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(spendRatio * 100)}>
          <div className="h-full rounded-full" style={{ width: `${spendRatio * 100}%`, background: spendRatio >= 1 ? '#C92A2A' : spendRatio >= 0.8 ? '#B45309' : '#00796B' }} />
        </div>
        {spendRatio >= 1 && <p className="text-sm font-medium mt-2" style={{ color: '#C92A2A' }}>Budget reached: drafting has stopped.</p>}
        {data.ai_usage.length > 0 && (
          <table className="w-full text-sm mt-4">
            <thead><tr className="text-left text-xs text-ink-500"><th className="font-semibold py-1">Used for</th><th className="font-semibold py-1 text-right">USD</th><th className="font-semibold py-1 text-right hidden sm:table-cell">Input tokens</th><th className="font-semibold py-1 text-right hidden sm:table-cell">Read from cache</th><th className="font-semibold py-1 text-right hidden sm:table-cell">Output tokens</th></tr></thead>
            <tbody>
              {data.ai_usage.map((u: any) => (
                <tr key={u.purpose} className="border-t border-ink-100 text-ink-700">
                  <td className="py-1.5 capitalize">{u.purpose}</td>
                  <td className="py-1.5 text-right">{u.cost.toFixed(2)}</td>
                  <td className="py-1.5 text-right hidden sm:table-cell">{u.input_tokens.toLocaleString()}</td>
                  <td className="py-1.5 text-right hidden sm:table-cell">{u.cache_read_tokens.toLocaleString()}</td>
                  <td className="py-1.5 text-right hidden sm:table-cell">{u.output_tokens.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="kh-card p-5 space-y-1">
        <h3 className="font-semibold text-ink-800">Worker</h3>
        <p className="text-sm text-ink-700">Last run: {when(data.worker_last_run)}{workerLate && <span className="font-semibold" style={{ color: '#C92A2A' }}> · Not running. Check the cron job.</span>}</p>
        <p className="text-sm text-ink-700">Last mailbox check: {when(data.last_poll_at)}</p>
        {data.last_poll_error && <p className="text-sm" style={{ color: '#C92A2A' }}>Last mailbox error: {data.last_poll_error}</p>}
      </div>
    </div>
  );
}
