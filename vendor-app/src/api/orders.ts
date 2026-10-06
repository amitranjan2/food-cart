import { request } from './client';
import type { Order, OrderStatus } from '../types';

export function getVendorOrders(token: string) {
  return request<Order[]>('/api/vendor/orders', { token });
}

export function patchOrderStatus(token: string, orderId: string, status: OrderStatus) {
  return request<Order>(`/api/vendor/orders/${orderId}/status`, {
    method: 'PATCH',
    token,
    body: { status },
  });
}
