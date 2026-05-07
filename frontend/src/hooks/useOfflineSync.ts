'use client';
import { useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const QUEUE_KEY = 'offline_sale_queue';

export function queueSale(payload: any) {
  const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  queue.push({ payload, ts: Date.now() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function useOfflineSync() {
  useEffect(() => {
    const sync = async () => {
      const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      if (!queue.length) return;
      const failed: any[] = [];
      for (const item of queue) {
        try {
          await api.post('/pos/sales', item.payload);
        } catch {
          failed.push(item);
        }
      }
      localStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
      if (queue.length - failed.length > 0) {
        toast.success(`Synced ${queue.length - failed.length} offline sale(s)`);
      }
    };

    window.addEventListener('online', sync);
    if (navigator.onLine) sync();
    return () => window.removeEventListener('online', sync);
  }, []);
}
