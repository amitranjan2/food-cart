'use client';

import Link from 'next/link';
import type { Vendor } from '../../lib/api';

export type PlacedOrder = {
  orderNumber: number;
  type: 'PICKUP' | 'DINE_IN';
  /** Start of the chosen slot, e.g. "2026-10-09T09:30:00Z". */
  scheduledFor: string;
  total: number;
  items: { menuItemId: string; name: string; quantity: number; lineTotal: number }[];
};

/** Slot times are India time (UTC+5:30, no daylight saving), whatever the phone's time zone. */
function indiaTime(iso: string) {
  const shifted = new Date(new Date(iso).getTime() + 330 * 60_000);
  return shifted.toLocaleString('en-US', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export function OrderConfirmation({ vendor, order }: { vendor: Vendor; order: PlacedOrder }) {
  return (
    <main className="shell min-h-screen bg-[#f8f6f0] p-5">
      <Link href="/" className="font-bold">← Home</Link>
      <div className="mx-auto mt-10 max-w-lg rounded-[28px] bg-white p-6 shadow-xl">
        <p className="text-xs font-bold tracking-widest text-emerald-700">ORDER CONFIRMED</p>
        <h1 className="mt-2 text-4xl">#{order.orderNumber}</h1>
        <p className="mt-4 rounded-xl bg-[#eef1e8] p-4 font-bold">Order is shared with the kitchen. We’ll keep you updated.</p>
        <div className="mt-5 rounded-2xl bg-stone-100 p-4">
          <b>{order.type === 'DINE_IN' ? 'Dine in at' : 'Pick up from'}</b>
          <p className="mt-2">{vendor.name}<br />{vendor.address}</p>
          <p className="mt-2 font-bold">{indiaTime(order.scheduledFor)}</p>
        </div>
        <div className="mt-5 rounded-2xl bg-stone-100 p-4">
          <b>Bill details</b>
          {order.items.map(item => (
            <p key={item.menuItemId} className="mt-2 flex justify-between">
              <span>{item.name} × {item.quantity}</span>
              <span>₹{item.lineTotal}</span>
            </p>
          ))}
          <hr className="my-3" />
          <b className="flex justify-between"><span>Total</span><span>₹{order.total}</span></b>
        </div>
      </div>
    </main>
  );
}
