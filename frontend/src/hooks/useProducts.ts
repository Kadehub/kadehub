'use client';
import { useEffect, useState } from 'react';
import { Product } from '../types';
import api from '../lib/api';

const CACHE_KEY = 'products_cache';
const CACHE_TTL = 5 * 60 * 1000;

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, ts } = JSON.parse(cached);
      if (Date.now() - ts < CACHE_TTL) { setProducts(data); setLoading(false); return; }
    }
    api.get('/inventory/products').then((r) => {
      const data = Array.isArray(r.data) ? r.data : [];
      setProducts(data);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
    }).finally(() => setLoading(false));
  }, []);

  const refresh = () => {
    localStorage.removeItem(CACHE_KEY);
    setLoading(true);
    api.get('/inventory/products').then((r) => {
      const data = Array.isArray(r.data) ? r.data : [];
      setProducts(data);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
    }).finally(() => setLoading(false));
  };

  return { products, loading, refresh };
}
