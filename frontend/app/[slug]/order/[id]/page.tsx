'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { request, type PublicMenu, type Vendor } from '../../../lib/api';
import { CANCEL_REASONS, indiaTime, type CustomerOrder, type OrderView } from '../../../lib/orders';
import { storedSession } from '../../../lib/session';
import { formatRupee } from '../../lib/customization';
import { themeStyle } from '../../../lib/theme';

/** Statuses that never change again; the page stops refreshing once it reaches one. */
const FINAL = new Set<CustomerOrder['status']>(['COMPLETED', 'REJECTED', 'CANCELLED', 'EXPIRED']);
const REFRESH_MS = 10_000;

function copyFor(order: CustomerOrder, vendorName: string) {
  const dineIn = order.type === 'DINE_IN';
  switch (order.status) {
    case 'PAYMENT_PENDING':
      return { title: 'Confirming payment', message: 'We’re confirming your payment with the bank. This usually takes a few seconds.' };
    case 'PLACED':
      return { title: 'Confirmed', message: 'Order is shared with the kitchen. Sit back and relax, we will keep you updated!' };
    case 'ACCEPTED':
    case 'PREPARING':
      return { title: 'Preparing', message: 'Order is accepted by the kitchen. It will be ready soon.' };
    case 'READY':
      return dineIn
        ? { title: 'Ready to serve', message: 'Your order is ready. Share the code below when it is served.' }
        : { title: 'Ready for pickup', message: 'Your order is ready for pickup. Share the code below while receiving your order.' };
    case 'COMPLETED':
      return { title: dineIn ? 'Served' : 'Picked up', message: `Enjoy your meal! Thanks for ordering from ${vendorName}.` };
    case 'REJECTED':
      return { title: 'Not accepted', message: 'The kitchen couldn’t accept this order. Your payment is refunded in full and reaches you in 3–5 business days.' };
    case 'CANCELLED': {
      const reason = order.cancelReason ? CANCEL_REASONS[order.cancelReason] : '';
      return {
        title: 'Cancelled by the kitchen',
        message: `${reason ? reason + '. ' : ''}Sorry about that. Your payment is refunded in full and reaches you in 3–5 business days.`,
      };
    }
    case 'EXPIRED':
      return { title: 'Payment not completed', message: 'This order wasn’t paid in time, so it was not sent to the kitchen. If any amount was taken, it will be refunded.' };
  }
}

function LinePhoto({ src }: { src?: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="cart-line-photo">
      {src && !broken ? <img src={src} alt="" onError={() => setBroken(true)} /> : <span className="media-fallback" />}
    </div>
  );
}

export default function OrderStatus({ params }: { params: { slug: string; id: string } }) {
  const [view, setView] = useState<OrderView | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [signedOut, setSignedOut] = useState(false);

  // Photos and the cover image come from the public menu; the order itself only stores names and prices.
  useEffect(() => {
    request<Vendor>('/api/public/vendors/' + params.slug).then(setVendor).catch(() => {});
    request<PublicMenu>('/api/public/vendors/' + params.slug + '/menu')
      .then(menu => setPhotos(Object.fromEntries(menu.items.filter(item => item.imageUrl).map(item => [item.id, item.imageUrl as string]))))
      .catch(() => {});
  }, [params.slug]);

  // Refresh until the order is final, and whenever the customer comes back to the tab.
  useEffect(() => {
    const token = storedSession();
    if (!token) {
      setSignedOut(true);
      return;
    }
    let stopped = false;
    let timer: number | undefined;
    async function load() {
      try {
        const next = await request<OrderView>('/api/orders/' + params.id, {}, token);
        if (stopped) return;
        setView(next);
        setError('');
        if (!FINAL.has(next.order.status)) timer = window.setTimeout(load, REFRESH_MS);
      } catch (e) {
        if (stopped) return;
        setError(e instanceof Error ? e.message : 'Could not load this order.');
        timer = window.setTimeout(load, REFRESH_MS);
      }
    }
    function onFocus() {
      if (document.visibilityState !== 'visible') return;
      window.clearTimeout(timer);
      load();
    }
    load();
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [params.id]);

  const back = (
    <Link href={'/' + params.slug} className="cart-back" aria-label="Back to menu">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M15 5 8 12l7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );

  if (!view) {
    return (
      <main className="storefront" style={themeStyle(vendor)}>
        <header className="cart-header">
          <div className="cart-title">{back}<h1>Your order</h1></div>
          <div className="store-scallop" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <span key={index} />)}</div>
        </header>
        <div className="status-body">
          <p className="status-message">
            {signedOut ? 'Open this page on the phone you ordered from to see your order.' : error || 'Loading your order…'}
          </p>
        </div>
      </main>
    );
  }

  const { order } = view;
  const vendorName = view.vendor.name ?? vendor?.name ?? 'the kitchen';
  const copy = copyFor(order, vendorName);
  const cancelled = order.status === 'REJECTED' || order.status === 'CANCELLED' || order.status === 'EXPIRED';
  const address = view.vendor.address ?? vendor?.address ?? '';
  const lat = view.vendor.lat ?? vendor?.lat;
  const lng = view.vendor.lng ?? vendor?.lng;
  // The stall's own GPS point when set (exact spot); otherwise search by name and address.
  const mapUrl = lat != null && lng != null
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([vendorName, address].filter(Boolean).join(', '));

  return (
    <main className="storefront" data-status={order.status} style={themeStyle(vendor)}>
      <header className="cart-header">
        <div className="cart-title">{back}<h1>{copy.title}</h1></div>
        <div className="store-scallop" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <span key={index} />)}</div>
      </header>
      <div className="status-body">
        <p className="status-message" aria-live="polite">{copy.message}</p>

        <section className={'status-card status-items' + (cancelled ? ' muted' : '')} aria-label={order.orderNumber ? 'Order #' + order.orderNumber : 'Your order'}>
          {/* Orders are numbered once paid; an unpaid one has no number yet. */}
          <p className="status-kicker">{order.orderNumber ? 'Order #' + order.orderNumber : 'Your order'}</p>
          {order.items.map((item, index) => {
            const photo = photos[item.menuItemId] || vendor?.coverImageUrl;
            return (
              <div className="status-line" key={item.menuItemId + index}>
                <LinePhoto src={photo} />
                <div>
                  <b>{item.name} x{item.quantity}</b>
                  {item.summary || (item.portion && item.portion !== 'FULL') ? <span>{item.summary || item.portion}</span> : null}
                </div>
              </div>
            );
          })}
        </section>

        {!cancelled && (
          <section className="status-card">
            <div className="status-card-head">
              <h2>{order.type === 'DINE_IN' ? 'Dine-in details' : 'Pick-up details'}</h2>
              {order.status === 'READY' && order.handover?.code ? <span className="status-code" aria-label={'Code ' + order.handover.code}>{order.handover.code}</span> : null}
            </div>
            <div className="status-place">
              <div>
                <b>{vendorName}</b>
                {address ? <span>{address}</span> : null}
                <span className="status-slot">{indiaTime(order.scheduledFor)}</span>
              </div>
              <a href={mapUrl} target="_blank" rel="noreferrer" className="status-map" aria-label="Open in maps">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <circle cx="12" cy="9.5" r="2.5" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              </a>
            </div>
          </section>
        )}

        <section className="status-card">
          <h2>Bill details</h2>
          {order.items.map((item, index) => (
            <div className="bill-row sub" key={item.menuItemId + index}>
              <span>{item.name} x{item.quantity}</span>
              <span>{formatRupee(Number(item.lineTotal))}</span>
            </div>
          ))}
          <div className="bill-row grand"><span>Total</span><span>{formatRupee(Number(order.total))}</span></div>
          {order.payment?.status === 'PAID' ? <p className="status-paid">Paid online</p> : null}
          {order.payment?.status === 'REFUNDED' || order.payment?.status === 'REFUND_PENDING' ? <p className="status-paid">Refund started</p> : null}
        </section>

        {view.vendor.phone ? (
          <a className="status-help" href={'tel:+91' + view.vendor.phone}>Need help? Call {vendorName}</a>
        ) : null}
        {error ? <p className="cart-pay-error">{error}</p> : null}
      </div>
    </main>
  );
}
