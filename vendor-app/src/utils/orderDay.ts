import type { Order } from '../types';

const IST_OFFSET_MS = 330 * 60_000;

/** The India calendar date ("2026-10-10") an order belongs to: its slot's day, or the day it was placed if it has no slot. */
export function orderDayKey(order: Pick<Order, 'scheduledFor' | 'createdAt'>) {
  const iso = order.scheduledFor || order.createdAt;
  const ms = iso ? new Date(iso).getTime() : Date.now();
  return new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * Today in India plus offsetDays, as a local Date whose year/month/day are the India date (for the date pager).
 * Uses India time, not the phone's time zone, so it matches orderDayKey.
 */
export function indiaDay(offsetDays = 0, now = Date.now()) {
  const india = new Date(now + IST_OFFSET_MS);
  return new Date(india.getUTCFullYear(), india.getUTCMonth(), india.getUTCDate() + offsetDays);
}

/** The calendar date shown on the vendor's date pager, as the same "YYYY-MM-DD" key. */
export function pagerDayKey(day: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
}

function slotTime(order: Pick<Order, 'scheduledFor' | 'createdAt' | 'orderNumber'>) {
  const iso = order.scheduledFor || order.createdAt;
  return iso ? new Date(iso).getTime() : 0;
}

/** Orders for one day, in the order the kitchen works through them: earliest slot first. */
export function ordersForDay<T extends Pick<Order, 'scheduledFor' | 'createdAt' | 'orderNumber'>>(orders: T[], dayKey: string) {
  return orders
    .filter(order => orderDayKey(order) === dayKey)
    .sort((a, b) => slotTime(a) - slotTime(b) || a.orderNumber - b.orderNumber);
}

/** Active orders (not rejected or cancelled) on any day after dayKey, for the badge on the next-day arrow. */
export function futureOrderCount<T extends Pick<Order, 'scheduledFor' | 'createdAt' | 'status'>>(orders: T[], dayKey: string) {
  return orders.filter(order => order.status !== 'REJECTED' && order.status !== 'CANCELLED' && orderDayKey(order) > dayKey).length;
}
