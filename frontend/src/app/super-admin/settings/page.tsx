'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../hooks/useAuth';
import api from '../../../lib/api';
import toast from 'react-hot-toast';
import { ShieldCheck, Mail, Key, Landmark, Building2 } from 'lucide-react';

export default function SuperAdminSettingsPage() {
  const { user } = useAuthStore();
  const [bank, setBank] = useState({ bank_name: '', account_name: '', account_number: '', branch: '', instructions: '' });
  const [company, setCompany] = useState({
    legal_name: '', trading_name: '', address: '', city: '', country: '',
    phone: '', email: '', website: '', vat_number: '', registration_number: '', vat_rate: '0',
  });
  const [savingBank, setSavingBank] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);

  useEffect(() => {
    api.get('/super-admin/bank-details').then(r => {
      if (r.data?.bank) setBank(b => ({ ...b, ...r.data.bank }));
    }).catch(() => {});
    api.get('/super-admin/platform-company').then(r => {
      if (r.data) setCompany(c => ({
        ...c, ...r.data,
        vat_rate: String(r.data.vat_rate ?? 0),
      }));
    }).catch(() => {});
  }, []);

  async function saveCompany(e: React.FormEvent) {
    e.preventDefault();
    setSavingCompany(true);
    try {
      const { data } = await api.patch('/super-admin/platform-company', {
        ...company,
        vat_rate: parseFloat(company.vat_rate) || 0,
      });
      setCompany(c => ({ ...c, ...data, vat_rate: String(data.vat_rate ?? 0) }));
      toast.success('Company details saved — appears on customer invoices');
    } catch { toast.error('Could not save company details'); }
    finally { setSavingCompany(false); }
  }

  async function saveBank(e: React.FormEvent) {
    e.preventDefault();
    setSavingBank(true);
    try {
      const { data } = await api.patch('/super-admin/bank-details', bank);
      setBank({ ...bank, ...data });
      toast.success('Bank details saved');
    } catch { toast.error('Could not save bank details'); }
    finally { setSavingBank(false); }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-ink-900">Settings</h2>
        <p className="text-sm text-ink-400 mt-0.5">Super admin account information</p>
      </div>

      <div className="kh-card p-6 space-y-5">
        <div className="flex items-center gap-4 pb-5 border-b border-ink-100">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold"
            style={{ background: 'linear-gradient(135deg,#00796B,#00A884)' }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-lg font-bold text-ink-900">{user?.name}</p>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold kh-badge-teal">SUPER ADMIN</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-ink-50">
            <Mail size={16} className="text-ink-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-ink-400">Email</p>
              <p className="text-sm font-semibold text-ink-800">superadmin@kadehub.com</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-ink-50">
            <Key size={16} className="text-ink-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-ink-400">Role</p>
              <p className="text-sm font-semibold text-ink-800">Platform Super Administrator</p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-ink-100">
          <p className="text-xs text-ink-400">
            To change the super admin password, update the <code className="bg-ink-100 px-1.5 py-0.5 rounded text-ink-600">password_hash</code> directly in the database using a bcrypt hash.
          </p>
        </div>
      </div>

      <div className="kh-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#E0F2F1' }}>
            <Building2 size={18} style={{ color: '#00796B' }} />
          </div>
          <div>
            <h3 className="font-semibold text-ink-800">Company details on invoices</h3>
            <p className="text-xs text-ink-400">Bill From section on customer-facing tax invoices</p>
          </div>
        </div>
        <form onSubmit={saveCompany} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm space-y-1 sm:col-span-2">
            <span className="text-ink-600">Legal company name</span>
            <input value={company.legal_name} onChange={e => setCompany(c => ({ ...c, legal_name: e.target.value }))}
              className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm" placeholder="KadeHub (Pvt) Ltd" />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-ink-600">Address</span>
            <input value={company.address} onChange={e => setCompany(c => ({ ...c, address: e.target.value }))}
              className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm" />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-ink-600">City</span>
            <input value={company.city} onChange={e => setCompany(c => ({ ...c, city: e.target.value }))}
              className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm" />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-ink-600">Phone</span>
            <input value={company.phone} onChange={e => setCompany(c => ({ ...c, phone: e.target.value }))}
              className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm" />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-ink-600">Email</span>
            <input value={company.email} onChange={e => setCompany(c => ({ ...c, email: e.target.value }))}
              className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm" />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-ink-600">Website</span>
            <input value={company.website} onChange={e => setCompany(c => ({ ...c, website: e.target.value }))}
              className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm" />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-ink-600">VAT number</span>
            <input value={company.vat_number} onChange={e => setCompany(c => ({ ...c, vat_number: e.target.value }))}
              className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm" placeholder="Optional" />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-ink-600">Business registration no.</span>
            <input value={company.registration_number} onChange={e => setCompany(c => ({ ...c, registration_number: e.target.value }))}
              className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm" placeholder="Optional" />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-ink-600">VAT rate (%)</span>
            <input type="number" min="0" max="100" step="0.01" value={company.vat_rate}
              onChange={e => setCompany(c => ({ ...c, vat_rate: e.target.value }))}
              className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm" />
          </label>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" disabled={savingCompany}
              className="kh-btn-primary px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">
              {savingCompany ? 'Saving…' : 'Save company details'}
            </button>
          </div>
        </form>
      </div>

      <div className="kh-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#E0F2F1' }}>
            <Landmark size={18} style={{ color: '#00796B' }} />
          </div>
          <div>
            <h3 className="font-semibold text-ink-800">Bank details for transfers</h3>
            <p className="text-xs text-ink-400">Shown to shops when they pay by bank slip</p>
          </div>
        </div>
        <form onSubmit={saveBank} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm space-y-1">
            <span className="text-ink-600">Bank name</span>
            <input value={bank.bank_name} onChange={e => setBank(b => ({ ...b, bank_name: e.target.value }))}
              className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm" />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-ink-600">Account name</span>
            <input value={bank.account_name} onChange={e => setBank(b => ({ ...b, account_name: e.target.value }))}
              className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm" />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-ink-600">Account number</span>
            <input value={bank.account_number} onChange={e => setBank(b => ({ ...b, account_number: e.target.value }))}
              className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm" />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-ink-600">Branch</span>
            <input value={bank.branch} onChange={e => setBank(b => ({ ...b, branch: e.target.value }))}
              className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm" />
          </label>
          <label className="text-sm space-y-1 sm:col-span-2">
            <span className="text-ink-600">Instructions</span>
            <textarea value={bank.instructions} onChange={e => setBank(b => ({ ...b, instructions: e.target.value }))}
              className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm min-h-[72px]" />
          </label>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" disabled={savingBank}
              className="kh-btn-primary px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">
              {savingBank ? 'Saving…' : 'Save bank details'}
            </button>
          </div>
        </form>
      </div>

      {/* Suggested features notice */}
      <div className="kh-card p-5" style={{ background: '#E0F2F1', borderColor: '#B2DFDB' }}>
        <h3 className="font-semibold mb-2" style={{ color: '#00796B' }}>💡 Suggested Features to Add</h3>
        <ul className="text-sm space-y-1.5" style={{ color: '#00796B' }}>
          {[
            'Email notifications when a shop subscribes or payment fails',
            'Email invoice PDF directly to customers',
            'Coupon / promo code management for discounts on plans',
            'Shop impersonation — log in as any shop for support',
            'Announcement broadcast to all shops',
            'API usage / request rate monitoring per shop',
            'Automated plan expiry reminders',
            'Revenue reports with CSV export',
          ].map(f => <li key={f} className="flex items-start gap-2"><span>•</span>{f}</li>)}
        </ul>
      </div>
    </div>
  );
}
