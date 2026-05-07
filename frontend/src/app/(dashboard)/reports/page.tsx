'use client';
import { useState } from 'react';
import { useDateRange } from '../../../hooks/useDateRange';
import DateRangePicker from '../../../components/ui/DateRangePicker';
import PosSalesReport from './PosSalesReport';
import ProductsReport from './ProductsReport';
import InventoryReport from './InventoryReport';
import CrmReport from './CrmReport';
import { ShoppingCart, Package, Boxes, Users } from 'lucide-react';

const TABS = [
  { key: 'pos',       label: 'POS Sales',  icon: ShoppingCart, dateRange: true },
  { key: 'products',  label: 'Products',   icon: Package,      dateRange: true },
  { key: 'inventory', label: 'Inventory',  icon: Boxes,        dateRange: false },
  { key: 'crm',       label: 'Customers',  icon: Users,        dateRange: true },
];

export default function ReportsPage() {
  const [tab, setTab] = useState('pos');
  const dateRange = useDateRange();
  const activeTab = TABS.find((t) => t.key === tab)!;

  return (
    <div className="space-y-5 max-w-7xl overflow-y-auto">
      {/* Tab bar + date range */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-white border border-ink-200 w-fit">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: tab === key ? '#00A884' : 'transparent',
                color: tab === key ? 'white' : '#64748B',
              }}>
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Date range — only for tabs that need it */}
        {activeTab.dateRange && <DateRangePicker {...dateRange} />}
      </div>

      {/* Tab content */}
      {tab === 'pos'       && <PosSalesReport  from={dateRange.from} to={dateRange.to} />}
      {tab === 'products'  && <ProductsReport  from={dateRange.from} to={dateRange.to} />}
      {tab === 'inventory' && <InventoryReport />}
      {tab === 'crm'       && <CrmReport       from={dateRange.from} to={dateRange.to} />}
    </div>
  );
}
