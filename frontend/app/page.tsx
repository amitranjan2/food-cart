'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { request, type Vendor } from './lib/api';
import { savedVendorSlugs } from './lib/savedVendors';
import { storedSession } from './lib/session';
import { PolicyFooter } from './components/LegalPage';

type Saved = { vendor: Vendor; totalOrders: number };

function VendorPhoto({ src }: { src?: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="cart-line-photo home-vendor-photo">
      {src && !broken ? <img src={src} alt="" onError={() => setBroken(true)} /> : <span className="media-fallback" />}
    </div>
  );
}

/**
 * The customer's own vendors: every storefront they have opened (QR scan or link), most recent first.
 * There is no public list of all vendors; in the web launch customers arrive through a vendor's link.
 */
export default function Home() {
  const [saved, setSaved] = useState<Saved[] | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const token = storedSession();
      const fromAccount: Saved[] = token
        ? await request<{ vendor: Vendor; totalOrders: number }[]>('/api/customers/me/recent-vendors', {}, token).catch(() => [])
        : [];
      const known = new Set(fromAccount.map(entry => entry.vendor.slug));
      // Vendors opened on this phone before signing in, or when the account call failed.
      const localOnly = await Promise.all(
        savedVendorSlugs()
          .filter(slug => !known.has(slug))
          .map(slug => request<Vendor>('/api/public/vendors/' + slug).then(vendor => ({ vendor, totalOrders: 0 })).catch(() => null)),
      );
      if (active) setSaved([...fromAccount, ...localOnly.filter((entry): entry is Saved => entry !== null)]);
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="storefront">
      <header className="cart-header">
        <div className="cart-title home-title"><h1>Your vendors</h1></div>
        <div className="store-scallop" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <span key={index} />)}</div>
      </header>
      <div className="status-body">
        {saved === null ? (
          <p className="status-message">Loading…</p>
        ) : saved.length === 0 ? (
          <div className="home-empty">
            <p className="home-empty-icon" aria-hidden="true">▢</p>
            <h2>No vendors yet</h2>
            <p>Scan a vendor’s QR code at their stall to open their menu. Vendors you open are saved here.</p>
          </div>
        ) : (
          saved.map(({ vendor, totalOrders }) => (
            <Link key={vendor.id} href={'/' + vendor.slug} className="status-card home-vendor">
              <VendorPhoto src={vendor.logoUrl || vendor.coverImageUrl} />
              <div className="home-vendor-copy">
                <b>{vendor.name}</b>
                {vendor.address ? <span>{vendor.address}</span> : null}
                <span className={vendor.status === 'OPEN' ? 'home-open' : 'home-closed'}>
                  {vendor.status === 'OPEN' ? 'Open now' : 'Closed'}
                  {totalOrders > 0 ? ` · ${totalOrders} ${totalOrders === 1 ? 'order' : 'orders'}` : ''}
                </span>
              </div>
              <span className="home-vendor-go" aria-hidden="true">›</span>
            </Link>
          ))
        )}
        <PolicyFooter />
      </div>
    </main>
  );
}
