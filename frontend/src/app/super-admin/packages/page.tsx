'use client';
import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { Package, Check } from 'lucide-react';

export default function PackagesPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/super-admin/packages').then(({ data }) => { setPackages(data); setLoading(false); });
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-ink-900">Subscription Packages</h2>
        <p className="text-sm text-ink-400 mt-0.5">All available plans on the platform</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="kh-card h-64 animate-pulse bg-ink-100" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {packages.map((pkg: any) => (
            <div key={pkg.id} className={`kh-card p-6 relative ${pkg.is_popular ? 'ring-2 ring-teal-600' : ''}`}>
              {pkg.is_popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#00796B,#00A884)' }}>Most Popular</span>
              )}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#E0F2F1' }}>
                  <Package size={18} style={{ color: '#00796B' }} />
                </div>
                <div>
                  <h3 className="font-bold text-ink-900">{pkg.name}</h3>
                  <p className="text-xs text-ink-400">{pkg.description || 'No description'}</p>
                </div>
              </div>
              <div className="mb-4">
                <p className="text-2xl font-bold text-ink-900">LKR {pkg.price_monthly?.toLocaleString()}<span className="text-sm font-medium text-ink-400">/mo</span></p>
                <p className="text-sm text-ink-400 mt-0.5">LKR {pkg.price_yearly?.toLocaleString()}/yr</p>
              </div>
              <div className="space-y-2">
                {pkg.modules?.map((m: any) => (
                  <div key={m.id} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#E0F2F1' }}>
                      <Check size={10} style={{ color: '#00796B' }} />
                    </div>
                    <span className="text-xs text-ink-600 capitalize">{m.module_name}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-ink-100 flex items-center justify-between text-xs text-ink-400">
                <span>{pkg.is_active ? '✓ Active' : '✗ Inactive'}</span>
                {pkg.employee_limit && <span>Max {pkg.employee_limit} staff</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
