import { request } from './client';
import type { Order, OrderStatus } from '../types';

export function getVendorOrders(token: string) {
  return request<Order[]>('/api/vendor/orders', { token });
}

/** Completes an order with the code the customer shows. */
export function handOverOrder(token: string, orderId: string, code: string) {
  return request<Order>(`/api/vendor/orders/${orderId}/handover`, {
    method: 'POST',
    token,
    body: { code },
  });
}

export function patchOrderStatus(token: string, orderId: string, status: OrderStatus) {
  return request<Order>(`/api/vendor/orders/${orderId}/status`, {
    method: 'PATCH',
    token,
    body: { status },
  });
}
