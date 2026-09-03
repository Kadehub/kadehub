'use client';
import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { LKR } from '../../lib/format';
import { Copy, Check, Landmark, Upload, FileText, Loader2 } from 'lucide-react';

type BankDetails = {
  bank_name: string;
  account_name: string;
  account_number: string;
  branch: string;
  instructions: string;
};

type Props = {
  type: 'registration_fee' | 'subscription';
  amount: number;
  currency?: string;
  packageId?: number;
  billingCycle?: 'monthly' | 'yearly';
  registrationFee?: number;
  depositorDefault?: string;
  onSuccess: () => void;
};

const fmt = (n: number, currency = 'LKR') =>
  currency === 'USD'
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
    : LKR(n);

export default function BankTransferForm({
  type, amount, currency = 'LKR', packageId, billingCycle, registrationFee, depositorDefault, onSuccess,
}: Props) {
  const [bank, setBank] = useState<BankDetails | null>(null);
  const [depositor, setDepositor] = useState(depositorDefault || '');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  useEffect(() => {
    api.get('/billing/payment-options').then(r => setBank(r.data.bank)).catch(() => {});
  }, []);

  const copy = (label: string, value: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(''), 1500);
    });
  };

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setError('Slip must be under 5MB'); return; }
    setError('');
    setFile(f);
    if (f.type.startsWith('image/')) setPreview(URL.createObjectURL(f));
    else setPreview('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError('Please upload your bank slip'); return; }
    if (!depositor.trim()) { setError('Enter the name used on the transfer'); return; }
    setLoading(true); setError('');
    const fd = new FormData();
    fd.append('type', type);
    fd.append('depositor_name', depositor.trim());
    if (notes.trim()) fd.append('notes', notes.trim());
    if (packageId) fd.append('package_id', String(packageId));
    if (billingCycle) fd.append('billing_cycle', billingCycle);
    if (registrationFee) fd.append('registration_fee', String(registrationFee));
    fd.append('slip', file);
    try {
      await api.post('/billing/bank-transfer', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });
      onSuccess();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : msg || 'Could not submit slip. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const rows = bank ? [
    { label: 'Bank', value: bank.bank_name },
    { label: 'Account name', value: bank.account_name },
    { label: 'Account number', value: bank.account_number },
    { label: 'Branch', value: bank.branch },
  ].filter(r => r.value) : [];

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4" style={{ background: '#E0F2F1', border: '1.5px solid #B2DFDB' }}>
        <div className="flex items-center gap-2 mb-3">
          <Landmark size={16} style={{ color: '#00796B' }} />
          <p className="font-bold text-ink-800 text-sm">Pay by bank transfer</p>
        </div>
        {rows.length === 0 ? (
          <p className="text-xs text-ink-500">Loading bank details…</p>
        ) : (
          <div className="space-y-2">
            {rows.map(r => (
              <div key={r.label} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-ink-500">{r.label}</span>
                <span className="flex items-center gap-1.5 font-semibold text-ink-800">
                  {r.value}
                  <button type="button" onClick={() => copy(r.label, r.value)}
                    className="p-1 rounded hover:bg-white/70 text-ink-400" title="Copy">
                    {copied === r.label ? <Check size={12} style={{ color: '#00A884' }} /> : <Copy size={12} />}
                  </button>
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 text-sm pt-2 border-t border-teal-200">
              <span className="text-ink-500">Amount to transfer</span>
              <span className="font-extrabold" style={{ color: '#00A884' }}>{fmt(amount, currency)}</span>
            </div>
          </div>
        )}
        {bank?.instructions && (
          <p className="text-xs text-ink-500 mt-3">{bank.instructions}</p>
        )}
        {!bank?.account_number && (
          <p className="text-xs text-amber-700 mt-2">
            Account number not published yet. WhatsApp{' '}
            <a href="https://wa.me/94702470064" target="_blank" rel="noreferrer" className="font-semibold underline">070 247 0064</a>
            {' '}for bank details, then upload your slip here.
          </p>
        )}
      </div>

      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">Name on the transfer</label>
          <input required value={depositor} onChange={e => setDepositor(e.target.value)}
            placeholder="e.g. Nimal Perera"
            className="w-full border border-ink-200 rounded-lg bg-white text-ink-800 text-sm px-3 py-2.5" />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">Notes (optional)</label>
          <input value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Branch, time of transfer, last 4 digits…"
            className="w-full border border-ink-200 rounded-lg bg-white text-ink-800 text-sm px-3 py-2.5" />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">Bank slip</label>
          <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-200 px-4 py-6 cursor-pointer hover:bg-ink-50">
            {preview ? (
              <img src={preview} alt="Slip preview" className="max-h-40 rounded-lg object-contain" />
            ) : file ? (
              <div className="flex items-center gap-2 text-sm text-ink-700">
                <FileText size={16} /> {file.name}
              </div>
            ) : (
              <>
                <Upload size={20} className="text-ink-400" />
                <span className="text-xs text-ink-500">JPG, PNG or PDF · Max 5MB</span>
              </>
            )}
            <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden"
              onChange={e => pickFile(e.target.files?.[0])} />
          </label>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button type="submit" disabled={loading}
          className="kh-btn-primary w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2">
          {loading ? <Loader2 size={16} className="animate-spin" /> : 'Submit slip for approval'}
        </button>
        <p className="text-xs text-center text-ink-400">Admin will verify the slip and activate your shop.</p>
      </form>
    </div>
  );
}
