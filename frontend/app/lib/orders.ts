/** A customer's order as the server returns it. */
export type CustomerOrder = {
  id: string;
  orderNumber: number;
  status: 'PAYMENT_PENDING' | 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
  type: 'PICKUP' | 'DINE_IN';
  /** Start of the chosen slot, e.g. "2026-10-09T09:30:00Z". */
  scheduledFor: string;
  /** The customer's handover code; whoever hands the order over must enter it. */
  handover?: { code?: string | null; verifiedAt?: string | null } | null;
  total: number;
  items: { menuItemId: string; name: string; portion?: string; summary?: string | null; quantity: number; lineTotal: number }[];
  payment?: { status: string } | null;
  /** The bill as charged; missing on orders from before pricing (their total is the item total). */
  bill?: { itemTotal: number; foodGst: number; platformFee: number; platformFeeGst: number; total: number; foodGstPercent: number; platformFeePercent: number; platformFeeGstPercent: number } | null;
  /** Tax invoice numbers, set when the order is handed over. */
  invoice?: { foodNumber: string; platformNumber: string; issuedAt: string } | null;
};

/** An order's stored bill in the shape BillRows shows. */
export function orderBill(order: CustomerOrder) {
  const b = order.bill;
  if (!b) return null;
  const bp = (percent: number) => Math.round(Number(percent) * 100);
  return {
    itemTotal: Number(b.itemTotal),
    foodGst: Number(b.foodGst),
    platformFee: Number(b.platformFee),
    platformFeeGst: Number(b.platformFeeGst),
    total: Number(b.total),
    rates: { foodGstBp: bp(b.foodGstPercent), platformFeeBp: bp(b.platformFeePercent), platformFeeGstBp: bp(b.platformFeeGstPercent) },
  };
}

/** GET /api/orders/{id}. phone is present only once the order is paid. */
export type OrderView = {
  order: CustomerOrder;
  /** lat/lng: the stall's GPS point, when the vendor set one. */
  vendor: { name?: string; slug?: string; address?: string; phone?: string; lat?: number; lng?: number };
};

/** Slot times are India time (UTC+5:30, no daylight saving), whatever the phone's time zone. */
export function indiaTime(iso: string) {
  const shifted = new Date(new Date(iso).getTime() + 330 * 60_000);
  return shifted.toLocaleString('en-US', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}
