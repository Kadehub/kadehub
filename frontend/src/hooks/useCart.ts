'use client';
import { create } from 'zustand';
import { CartItem, Product } from '../types';

interface CartStore {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: number) => void;
  updateQty: (productId: number, qty: number) => void;
  clear: () => void;
  total: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  addItem: (product) => {
    const items = get().items;
    const existing = items.find((i) => i.product.id === product.id);
    if (existing) {
      set({ items: items.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i) });
    } else {
      set({ items: [...items, { product, quantity: 1 }] });
    }
  },
  removeItem: (id) => set({ items: get().items.filter((i) => i.product.id !== id) }),
  updateQty: (id, qty) => {
    if (qty <= 0) { get().removeItem(id); return; }
    set({ items: get().items.map((i) => i.product.id === id ? { ...i, quantity: qty } : i) });
  },
  clear: () => set({ items: [] }),
  total: () => get().items.reduce((s, i) => s + i.product.price * i.quantity, 0),
}));
