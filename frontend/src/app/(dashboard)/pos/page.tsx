'use client';
import { useEffect, useState } from 'react';
import { useProducts } from '../../../hooks/useProducts';
import ProductGrid from '../../../components/pos/ProductGrid';
import Cart from '../../../components/pos/Cart';
import { ShoppingBag } from 'lucide-react';
import { useCartStore } from '../../../hooks/useCart';

function CartBadge() {
  const items = useCartStore(s => s.items);
  const count = items.reduce((n, i) => n + i.quantity, 0);
  return count > 0 ? (
    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold text-white flex items-center justify-center"
      style={{ background: '#FFB703', color: '#0F172A' }}>{count}</span>
  ) : null;
}

export default function PosPage() {
  const { products, loading, refresh } = useProducts();
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') document.getElementById('product-search')?.focus();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      {/* ── Desktop: side-by-side, full height ── */}
      <div className="hidden lg:flex -m-6 overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden p-6 pr-3" style={{ minHeight: 0 }}>
          {loading ? (
            <div className="flex items-center justify-center flex-1 text-ink-400 text-sm">Loading products…</div>
          ) : (
            <ProductGrid products={products} />
          )}
        </div>
        <div className="w-72 xl:w-80 flex-shrink-0 flex flex-col overflow-hidden p-6 pl-3 border-l border-ink-200">
          <Cart onSaleComplete={refresh} />
        </div>
      </div>

      {/* ── Mobile: products fill screen, cart is a slide-up drawer ── */}
      <div className="lg:hidden flex flex-col -m-4 overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>
        {/* Products panel — full height minus bottom bar */}
        <div className="flex-1 overflow-hidden flex flex-col p-3 pb-0" style={{ minHeight: 0 }}>
          {loading ? (
            <div className="flex items-center justify-center flex-1 text-ink-400 text-sm">Loading products…</div>
          ) : (
            <ProductGrid products={products} />
          )}
        </div>

        {/* Sticky cart toggle bar */}
        <div className="flex-shrink-0 bg-white border-t border-ink-200 px-4 py-2.5">
          <button
            onClick={() => setCartOpen(true)}
            className="kh-btn-primary w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 relative"
          >
            <span className="relative inline-flex">
              <ShoppingBag size={18} />
              <CartBadge />
            </span>
            View Cart &amp; Checkout
          </button>
        </div>
      </div>

      {/* ── Mobile cart drawer ── */}
      {cartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="relative bg-white rounded-t-2xl flex flex-col overflow-hidden"
            style={{ maxHeight: '90vh', minHeight: '60vh' }}>
            {/* Drag handle + close */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-ink-100">
              <div className="w-10 h-1 rounded-full bg-ink-200 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
              <span className="font-semibold text-ink-800 text-sm">Cart</span>
              <button onClick={() => setCartOpen(false)}
                className="text-xs text-ink-400 hover:text-ink-700 px-2 py-1 rounded-lg hover:bg-ink-100">
                Close
              </button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              <Cart onSaleComplete={() => { refresh(); setCartOpen(false); }} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
