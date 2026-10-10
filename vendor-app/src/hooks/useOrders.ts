import { useCallback, useState } from 'react';
import { ordersForDay, pagerDayKey } from '../utils/orderDay';
import { cancelOrder, getVendorOrders, handOverOrder, patchOrderStatus } from '../api/orders';
import { isAuthFailure } from '../api/client';
import { useAuth } from '../state/AuthContext';
import type { Order, OrderStatus } from '../types';
import { NEXT_ORDER_STATUS } from '../utils/orderStatus';

export function useOrders() {
  const { token, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(
    /** quiet: background polling — no spinner, and a failed check keeps the current list instead of showing an error. */
    async (silent = false, quiet = false) => {
      if (!token) return;
      if (!quiet) {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        setError('');
      }
      try {
        const next = await getVendorOrders(token);
        setOrders(next);
        if (quiet) setError('');
      } catch (e) {
        if (isAuthFailure(e)) {
          await logout();
          return;
        }
        if (!quiet) setError(e instanceof Error ? e.message : 'Could not load orders');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, logout],
  );

  const advanceStatus = useCallback(
    async (order: Order, target?: OrderStatus) => {
      if (!token) return;
      const next = target ?? NEXT_ORDER_STATUS[order.status];
      if (!next || next === order.status) return;
      try {
        const saved = await patchOrderStatus(token, order.id, next);
        const latest = await getVendorOrders(token);
        setOrders(latest);
        return { patched: saved, fetched: latest.find(item => item.id === order.id), reconciled: false };
      } catch (e) {
        const latest = await getVendorOrders(token).catch(() => null);
        const fetched = latest?.find(item => item.id === order.id);
        if (latest && fetched && fetched.status !== order.status) {
          setOrders(latest);
          return { patched: undefined, fetched, reconciled: true };
        }
        throw e;
      }
    },
    [token],
  );

  /** READY orders complete only through the customer's handover code. */
  const handOver = useCallback(
    async (order: Order, code: string) => {
      if (!token) return;
      await handOverOrder(token, order.id, code);
      setOrders(await getVendorOrders(token));
    },
    [token],
  );

  /** After accepting: refunds the customer. */
  const cancel = useCallback(
    async (order: Order, reason: string) => {
      if (!token) return;
      await cancelOrder(token, order.id, reason);
      setOrders(await getVendorOrders(token));
    },
    [token],
  );

  return { orders, loading, refreshing, error, refresh, advanceStatus, handOver, cancel };
}

export function filterOrders(
  orders: Order[],
  day: Date,
  status: OrderStatus | 'ALL',
  query: string,
) {
  const needle = query.trim().toLowerCase();
  // Orders belong to the day of their slot (an order placed tonight for tomorrow shows on tomorrow), earliest slot first.
  return ordersForDay(orders, pagerDayKey(day)).filter(order => {
    if (status !== 'ALL' && order.status !== status) return false;
    if (!needle) return true;
    const haystack = `${order.orderNumber} ${order.customerName ?? ''} ${order.customerMobile ?? ''} ${order.items.map(item => item.name).join(' ')}`.toLowerCase();
    return haystack.includes(needle);
  });
}
