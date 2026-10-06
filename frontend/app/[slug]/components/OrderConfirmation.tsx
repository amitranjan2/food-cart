'use client';

import Link from 'next/link';
import type { Vendor } from '../../lib/api';

export type PlacedOrder = {
  orderNumber: number;
  total: number;
  items: { menuItemId: string; name: string; quantity: number; lineTotal: number }[];
};

export function OrderConfirmation({ vendor, order }: { vendor: Vendor; order: PlacedOrder }) {
  return (
    <main className="shell min-h-screen bg-[#f8f6f0] p-5">
      <Link href="/" className="font-bold">← Home</Link>
      <div className="mx-auto mt-10 max-w-lg rounded-[28px] bg-white p-6 shadow-xl">
        <p className="text-xs font-bold tracking-widest text-emerald-700">ORDER CONFIRMED</p>
        <h1 className="mt-2 text-4xl">#{order.orderNumber}</h1>
        <p className="mt-4 rounded-xl bg-[#eef1e8] p-4 font-bold">Order is shared with the kitchen. We’ll keep you updated.</p>
        <div className="mt-5 rounded-2xl bg-stone-100 p-4">
          <b>Pick up details</b>
          <p className="mt-2">{vendor.name}<br />{vendor.address}</p>
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
