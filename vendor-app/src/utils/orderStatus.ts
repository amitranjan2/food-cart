import type { Order, OrderStatus } from '../types';

export const NEXT_ORDER_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PLACED: 'ACCEPTED',
  ACCEPTED: 'PREPARING',
  PREPARING: 'READY',
  READY: 'COMPLETED',
};

export const ORDER_LIST_ACTION: Partial<Record<OrderStatus, string>> = {
  PLACED: 'Accept',
  ACCEPTED: 'Mark Prepared',
  PREPARING: 'Mark Ready',
  READY: 'Hand Over',
};

export const ORDER_CHIP: Record<OrderStatus, { label: string; background: string; color: string }> = {
  PLACED: { label: 'NEW ORDER', background: '#E7F1FF', color: '#2F6BFF' },
  ACCEPTED: { label: 'In-Preparation', background: '#FFF1E4', color: '#E07A2F' },
  PREPARING: { label: 'Packing/Serving', background: '#F3E8FF', color: '#7C4DDB' },
  READY: { label: 'Awaiting Pickup', background: '#FFF6D8', color: '#C48A12' },
  COMPLETED: { label: 'Completed', background: '#E7F8EE', color: '#1F9D55' },
  REJECTED: { label: 'Cancelled', background: '#FDECEC', color: '#E25555' },
  CANCELLED: { label: 'Cancelled', background: '#FDECEC', color: '#E25555' },
};

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

export const ORDER_DETAIL_ACTION: Partial<Record<OrderStatus, string>> = {
  PLACED: 'ACCEPT ORDER',
  ACCEPTED: 'MARK PREPARING',
  PREPARING: 'MARK READY',
  READY: 'HAND OVER (ENTER CODE)',
};
