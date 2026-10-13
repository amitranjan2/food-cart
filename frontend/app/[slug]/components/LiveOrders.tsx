'use client';

import Link from 'next/link';
import type { LiveOrder } from '../../lib/liveOrders';

const STATUS: Record<LiveOrder['status'], string> = {
  PLACED: 'Sent',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY: 'Ready',
};

/** Most bars shown at once; the rest are one tap away on the order page. */
export const LIVE_BAR_LIMIT = 3;
/** Height of one bar plus its gap; the page reserves this much room per bar (--live-extra). */
export const LIVE_BAR_SPACE = 44;

/**
 * Slim bars at the bottom for orders still in progress, latest first: order number, item count and where it is.
 * Each opens that order. `raised` lifts them above the cart bar.
 */
export function LiveOrders({ orders, raised }: { orders: LiveOrder[]; raised: boolean }) {
  const shown = orders.slice(0, LIVE_BAR_LIMIT);
  if (shown.length === 0) return null;
  return (
    <nav className={'live-orders' + (raised ? ' above-cart' : '')} aria-label="Your orders in progress">
      {shown.map(order => (
        <Link key={order.id} href={`/${order.vendorSlug}/order/${order.id}`} className={'live-order ' + order.status.toLowerCase()}>
          <i aria-hidden="true" />
          <b>#{order.orderNumber}</b>
          <span>
            {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
            <em>{STATUS[order.status]}</em>
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      ))}
    </nav>
  );
}
