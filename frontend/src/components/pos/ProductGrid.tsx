'use client';
import { useState } from 'react';
import { Product } from '../../types';
import { useCartStore } from '../../hooks/useCart';
import { LKR } from '../../lib/format';
import { Search, Tag } from 'lucide-react';
import { ProductImage } from '../ui/ProductImage';

interface Props { products: Product[]; }

const CATEGORIES = ['All', 'Grocery', 'Dairy', 'Bakery', 'Beverages', 'Snacks', 'Pharmacy', 'Personal Care', 'Household'];

export default function ProductGrid({ products }: Props) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const addItem = useCartStore((s) => s.addItem);

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode || '').includes(search);
    const matchCat = category === 'All' || p.category === category;
    return matchSearch && matchCat;
  });

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          id="product-search"
          className="w-full pl-9 pr-3 py-2.5 border border-ink-200 rounded-xl bg-white text-sm placeholder:text-ink-400"
          placeholder="Search products or scan barcode… (F2)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Category pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 flex-shrink-0">
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCategory(c)}
            className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all"
            style={{
              background: category === c ? '#00A884' : 'white',
              color: category === c ? 'white' : '#475569',
              border: `1px solid ${category === c ? '#00A884' : '#E2E8F0'}`,
            }}>
            {c}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 overflow-y-auto flex-1 content-start">
        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-ink-400">
            <Tag size={32} className="mb-2 opacity-30" />
            <p className="text-sm">No products found</p>
          </div>
        )}
        {filtered.map((p) => {
          const qty = p.inventory?.quantity ?? 0;
          const low = qty > 0 && qty <= (p.inventory?.reorder_level ?? 10);
          const out = qty <= 0;
          return (
            <button key={p.id} onClick={() => addItem(p)} disabled={out}
              className="kh-card p-3 text-left transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-card">

              {/* Product image / category default */}
              <ProductImage imageUrl={p.image_url} category={p.category} name={p.name} size={56} className="mb-2 rounded-lg" />

              <p className="font-semibold text-sm text-ink-800 leading-tight line-clamp-2">{p.name}</p>
              <p className="text-sm font-bold mt-1" style={{ color: '#FF7A00' }}>{LKR(p.price)}</p>

              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs" style={{ color: out ? '#ef4444' : low ? '#d97706' : '#94a3b8' }}>
                  {out ? 'Out of stock' : `${qty} left`}
                </span>
                {low && !out && (
                  <span className="text-2xs px-1.5 py-0.5 rounded-full font-semibold"
                    style={{ background: '#fef3c7', color: '#d97706' }}>Low</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
