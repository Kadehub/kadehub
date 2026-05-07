'use client';
import { useEffect, useState } from 'react';
import api from '../lib/api';

export function useSubscribedModules() {
  const [modules, setModules] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get('/billing/subscriptions')
      .then(r => {
        const subs = Array.isArray(r.data) ? r.data : [];
        // deduplicate module names
        const names = Array.from(new Set(
          subs.filter((s: any) => s.status === 'active').map((s: any) => s.module_name as string)
        ));
        setModules(names);
      })
      .catch(() => setModules([]))
      .finally(() => setLoaded(true));
  }, []);

  const hasModule = (name: string) => modules.includes(name);

  return { modules, loaded, hasModule };
}
