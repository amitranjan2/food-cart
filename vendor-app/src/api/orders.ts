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

/** Calls off an accepted order; the customer is refunded in full. reason is a CANCEL_REASONS key. */
export function cancelOrder(token: string, orderId: string, reason: string) {
  return request<Order>(`/api/vendor/orders/${orderId}/cancel`, {
    method: 'POST',
    token,
    body: { reason },
  });
}

export function patchOrderStatus(token: string, orderId: string, status: OrderStatus) {
  return request<Order>(`/api/vendor/orders/${orderId}/status`, {
    method: 'PATCH',
    token,
    body: { status },
  });
}
