import type { Order, OrderStatus } from '../types';
import type { Tone } from '../ui/Chip';

export const NEXT_ORDER_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PLACED: 'ACCEPTED',
  ACCEPTED: 'PREPARING',
  PREPARING: 'READY',
  READY: 'COMPLETED',
};

export const ORDER_LIST_ACTION: Partial<Record<OrderStatus, string>> = {
  PLACED: 'Accept',
  ACCEPTED: 'Mark prepared',
  PREPARING: 'Mark ready',
  READY: 'Hand over',
};

/** The badge each order shows (tones from ui/Chip). */
export const ORDER_BADGE: Record<OrderStatus, { label: string; tone: Tone }> = {
  PLACED: { label: 'New order', tone: 'info' },
  ACCEPTED: { label: 'In preparation', tone: 'orange' },
  PREPARING: { label: 'Packing / serving', tone: 'purple' },
  READY: { label: 'Awaiting pickup', tone: 'warning' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
  NO_SHOW: { label: 'Not collected', tone: 'danger' },
};

/** The customer pays the stall when collecting (no online payment). */
export function paysAtStall(order: Order) {
  return order.paymentMethod === 'CASH' && !order.payment;
}

/** Same as the API (CheckoutService.NO_SHOW_AFTER): the stall may mark a pay-at-stall order as not collected 30 minutes after the slot starts. */
export const NO_SHOW_AFTER_MS = 30 * 60_000;

export function canMarkNoShow(order: Order, now: number) {
  if (!paysAtStall(order) || !order.scheduledFor) return false;
  if (order.status !== 'ACCEPTED' && order.status !== 'PREPARING' && order.status !== 'READY') return false;
  return now >= new Date(order.scheduledFor).getTime() + NO_SHOW_AFTER_MS;
}

export function orderStatusStartedAt(order: Order) {
  if (order.status === 'ACCEPTED') return order.acceptedAt || order.createdAt;
  if (order.status === 'PREPARING') return order.preparingAt || order.acceptedAt || order.createdAt;
  if (order.status === 'READY') return order.readyAt || order.preparingAt || order.createdAt;
  return order.createdAt;
}

export function formatOrderType(type?: string | null) {
  if (!type) return '';
  if (type === 'DINE_IN') return 'Dine-in';
  if (type === 'PICKUP') return 'Pickup';
  if (type === 'DELIVERY') return 'Delivery';
  return type
    .toLowerCase()
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
