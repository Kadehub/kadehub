'use client';
import { useEffect, useState } from 'react';
import { Card } from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import { LKR } from '../../../lib/format';
import api from '../../../lib/api';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ProductImage } from '../../../components/ui/ProductImage';

interface Props { from: string; to: string; }

const COLORS = ['#00A884', '#FF7A00', '#2563EB', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444'];

export default function ProductsReport({ from, to }: Props) {
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/analytics/top-products?from=${from}&to=${to}&limit=15`),
      api.get(`/analytics/category-breakdown?from=${from}&to=${to}`),
    ]).then(([tp, cb]) => {
      setTopProducts(Array.isArray(tp.data) ? tp.data : []);
      setCategories(Array.isArray(cb.data) ? cb.data : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [from, to]);

  if (loading) return <div className="py-20 text-center text-ink-400 text-sm">Loading…</div>;

  const totalQty = topProducts.reduce((s, p) => s + +p.total_qty, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Category pie */}
        <Card>
          <h3 className="font-semibold text-ink-800 mb-4">Revenue by Category</h3>
          {categories.length === 0 ? (
            <p className="text-center text-ink-300 text-sm py-12">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={categories} dataKey="revenue" nameKey="category" cx="50%" cy="50%"
                  outerRadius={90} innerRadius={50} paddingAngle={3}>
                  {categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => LKR(+v)} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Category table */}
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-ink-100">
            <h3 className="font-semibold text-ink-800">Category Breakdown</h3>
          </div>
          {categories.length === 0 ? (
            <p className="text-center text-ink-300 text-sm py-12">No data</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="mob-cards w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100">
                  {['Category', 'Units Sold', 'Revenue'].map((h) => (
                    <th key={h} className={`px-5 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wide ${h === 'Revenue' ? 'text-right' : h === 'Units Sold' ? 'text-center' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map((c, i) => (
                  <tr key={i} className="border-b border-ink-50 hover:bg-ink-50 last:border-0">
                    <td data-label="Category" className="px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="font-medium text-ink-700">{c.category}</span>
                      </div>
                    </td>
                    <td data-label="Units" className="px-5 py-2.5 text-center text-ink-600">{c.total_qty}</td>
                    <td data-label="Revenue" className="px-5 py-2.5 text-right font-bold" style={{ color: '#FF7A00' }}>{LKR(+c.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </Card>
      </div>

      {/* Top products table */}
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-ink-100">
          <h3 className="font-semibold text-ink-800">Top Selling Products</h3>
        </div>
        {topProducts.length === 0 ? (
          <p className="text-center text-ink-300 text-sm py-12">No sales data for this period</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="mob-cards w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100">
                {['#', 'Product', 'Category', 'Units Sold', 'Avg Price', 'Revenue', 'Share'].map((h) => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wide ${['Units Sold', 'Avg Price', 'Revenue'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p, i) => {
                const pct = totalQty > 0 ? Math.round((+p.total_qty / totalQty) * 100) : 0;
                return (
                  <tr key={p.id} className="border-b border-ink-50 hover:bg-ink-50 last:border-0">
                    <td data-label="#" className="px-4 py-3 text-ink-400 text-xs font-bold">{i + 1}</td>
                    <td data-label="Product" className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ProductImage category={p.category} name={p.name} size={32} />
                        <span className="font-semibold text-ink-800">{p.name}</span>
                      </div>
                    </td>
                    <td data-label="Category" className="px-4 py-3">
                      {p.category ? <Badge variant="gray">{p.category}</Badge> : <span className="text-ink-300">—</span>}
                    </td>
                    <td data-label="Units" className="px-4 py-3 text-right font-bold text-ink-700">{p.total_qty}</td>
                    <td data-label="Avg Price" className="px-4 py-3 text-right text-ink-500">{LKR(+p.avg_price)}</td>
                    <td data-label="Revenue" className="px-4 py-3 text-right font-bold" style={{ color: '#FF7A00' }}>{LKR(+p.revenue)}</td>
                    <td data-label="Share" className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#00A884' }} />
                        </div>
                        <span className="text-xs text-ink-400 w-8 text-right">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </Card>
    </div>
  );
}
