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
  /** Why the kitchen cancelled after accepting (a CANCEL_REASONS key). */
  cancelReason?: string | null;
};

/** Same wording as the vendor app's cancel dialog and the API's CancelReasons. */
export const CANCEL_REASONS: Record<string, string> = {
  ITEM_UNAVAILABLE: 'A dish ran out',
  STALL_CLOSING: 'The stall had to close',
  TOO_BUSY: 'The kitchen is too busy',
  OTHER: 'Something came up at the stall',
};

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
