'use client';
import { useState } from 'react';
import { useDateRange } from '../../../hooks/useDateRange';
import DateRangePicker from '../../../components/ui/DateRangePicker';
import BasicReport from './BasicReport';
import PosSalesReport from './PosSalesReport';
import ProductsReport from './ProductsReport';
import InventoryReport from './InventoryReport';
import CrmReport from './CrmReport';
import { BarChart2, ShoppingCart, Package, Boxes, Users } from 'lucide-react';

const TABS = [
  { key: 'basic',     label: 'Basic Report', icon: BarChart2,     dateRange: true,  free: true },
  { key: 'pos',       label: 'POS Sales',    icon: ShoppingCart,  dateRange: true,  free: false },
  { key: 'products',  label: 'Products',     icon: Package,       dateRange: true,  free: false },
  { key: 'inventory', label: 'Inventory',    icon: Boxes,         dateRange: false, free: false },
  { key: 'crm',       label: 'Customers',    icon: Users,         dateRange: true,  free: false },
];

export default function ReportsPage() {
  const [tab, setTab] = useState('basic');
  const dateRange = useDateRange();
  const activeTab = TABS.find((t) => t.key === tab)!;

  return (
    <div className="space-y-5 max-w-7xl overflow-y-auto">
      {/* Tab bar + date range */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-white border border-ink-200 w-fit overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon, free }) => (
            <button key={key} onClick={() => setTab(key)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all relative"
              style={{
                background: tab === key ? '#00A884' : 'transparent',
                color: tab === key ? 'white' : '#64748B',
              }}>
              <Icon size={15} />
              {label}
              {free && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-2xs font-bold"
                  style={{ background: tab === key ? 'rgba(255,255,255,0.25)' : '#E0F2F1', color: tab === key ? 'white' : '#00796B', fontSize: '9px' }}>
                  FREE
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Date range — only for tabs that need it */}
        {activeTab.dateRange && <DateRangePicker {...dateRange} />}
      </div>

      {/* Tab content */}
      {tab === 'basic'     && <BasicReport     from={dateRange.from} to={dateRange.to} />}
      {tab === 'pos'       && <PosSalesReport  from={dateRange.from} to={dateRange.to} />}
      {tab === 'products'  && <ProductsReport  from={dateRange.from} to={dateRange.to} />}
      {tab === 'inventory' && <InventoryReport />}
      {tab === 'crm'       && <CrmReport       from={dateRange.from} to={dateRange.to} />}
    </div>
  );
}
