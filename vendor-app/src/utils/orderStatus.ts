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
};

/** Orders the vendor can still call off (with a refund). New ones are rejected instead. */
export const CANCELLABLE: OrderStatus[] = ['ACCEPTED', 'PREPARING', 'READY'];

/** Same wording as the API's CancelReasons and the storefront's order page. */
export const CANCEL_REASONS: { key: string; label: string }[] = [
  { key: 'ITEM_UNAVAILABLE', label: 'A dish ran out' },
  { key: 'STALL_CLOSING', label: 'The stall had to close' },
  { key: 'TOO_BUSY', label: 'The kitchen is too busy' },
  { key: 'OTHER', label: 'Something came up at the stall' },
];

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
