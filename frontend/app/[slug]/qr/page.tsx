'use client';

import { useEffect, useState } from 'react';
import { API, request, type Vendor } from '../../lib/api';
import { LEGAL } from '../../lib/legal';
import { themeStyle } from '../../lib/theme';

/**
 * The printable "Scan to order" poster for a stall (A4, opened from the vendor app's Share card). The QR code comes
 * from the API and always encodes the public store link.
 */
export default function Poster({ params }: { params: { slug: string } }) {
  const [vendor, setVendor] = useState<Vendor>();
  const [missing, setMissing] = useState(false);
  const [host, setHost] = useState(LEGAL.domain);

  useEffect(() => {
    setHost(window.location.host);
    request<Vendor>(`/api/public/vendors/${encodeURIComponent(params.slug)}`)
      .then(found => {
        setVendor(found);
        document.title = `Scan to order · ${found.name}`;
      })
      .catch(() => setMissing(true));
  }, [params.slug]);

  if (missing) return <main className="poster-page"><p className="poster-missing">No store at this link.</p></main>;
  if (!vendor) return <main className="poster-page" />;

  return (
    <main className="poster-page" style={themeStyle(vendor)}>
      <div className="poster-tools">
        <button type="button" onClick={() => window.print()}>Print poster</button>
        <span>A4, portrait. Stick it where customers queue.</span>
      </div>
      <article className="poster" aria-label={`Scan to order poster for ${vendor.name}`}>
        <header className="poster-head">
          <h1>{vendor.name}</h1>
          {vendor.address ? <p>{vendor.address}</p> : null}
        </header>
        <section className="poster-body">
          <p className="poster-call">Scan to order</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="poster-qr" src={`${API}/api/public/vendors/${encodeURIComponent(vendor.slug)}/qr.svg`} alt={`QR code for ${host}/${vendor.slug}`} />
          <ol className="poster-steps">
            <li>Scan with your phone camera</li>
            <li>Pick your dishes and a time</li>
            <li>Pay online, collect at the counter</li>
          </ol>
          <p className="poster-link">{host}/{vendor.slug}</p>
        </section>
        <footer className="poster-foot">Ordering by {LEGAL.brand}</footer>
      </article>
    </main>
  );
}
