'use client';
import { useEffect } from 'react';
import { useProducts } from '../../../hooks/useProducts';
import ProductGrid from '../../../components/pos/ProductGrid';
import Cart from '../../../components/pos/Cart';

export default function PosPage() {
  const { products, loading, refresh } = useProducts();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') document.getElementById('product-search')?.focus();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /*
   * The parent <main> is: h = 100vh - 56px(topbar), with p-6 = 24px padding all sides.
   * We escape the padding with -m-6 then re-add p-6 ourselves so we control the height.
   * This gives us exactly: 100vh - 56px to work with.
   */
  return (
    <div className="-m-6 flex overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>

      {/* Product panel */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden p-6 pr-3">
        {loading ? (
          <div className="flex items-center justify-center flex-1 text-ink-400 text-sm">
            Loading products…
          </div>
        ) : (
          <ProductGrid products={products} />
        )}
      </div>

      {/* Cart panel — fixed width */}
      <div className="w-72 xl:w-80 flex-shrink-0 flex flex-col overflow-hidden p-6 pl-3">
        <Cart onSaleComplete={refresh} />
      </div>
    </div>
  );
}
