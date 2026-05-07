'use client';
import { useAuthStore } from '../../../hooks/useAuth';
import { ShieldCheck, Mail, Key } from 'lucide-react';

export default function SuperAdminSettingsPage() {
  const { user } = useAuthStore();

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

      {/* Suggested features notice */}
      <div className="kh-card p-5" style={{ background: '#E0F2F1', borderColor: '#B2DFDB' }}>
        <h3 className="font-semibold mb-2" style={{ color: '#00796B' }}>💡 Suggested Features to Add</h3>
        <ul className="text-sm space-y-1.5" style={{ color: '#00796B' }}>
          {[
            'Email notifications when a shop subscribes or payment fails',
            'Manual invoice generation and download (PDF)',
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
