'use client';

import { useEffect, useState } from 'react';
import { request } from './api';

/** An order still in the kitchen's hands, as GET /api/orders/active returns it (latest first). */
export type LiveOrder = {
  id: string;
  orderNumber: number;
  status: 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY';
  itemCount: number;
  vendorName?: string;
  vendorSlug?: string;
};

const REFRESH_MS = 15_000;

/** The signed-in customer's open orders, refreshed while the tab is visible. Empty when signed out. */
export function useLiveOrders(token: string) {
  const [orders, setOrders] = useState<LiveOrder[]>([]);

  useEffect(() => {
    if (!token) {
      setOrders([]);
      return;
    }
    let active = true;
    const load = () => {
      if (document.visibilityState === 'hidden') return;
      request<LiveOrder[]>('/api/orders/active', {}, token)
        .then(rows => active && setOrders(rows))
        .catch(() => {});
    };
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    document.addEventListener('visibilitychange', load);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
    };
  }, [token]);

  return orders;
}
