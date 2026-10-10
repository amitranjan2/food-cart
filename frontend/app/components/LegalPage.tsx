import Link from 'next/link';
import type { ReactNode } from 'react';
import { LEGAL, missingLegalFields, type LegalField } from '../lib/legal';

const LABELS: Record<LegalField, string> = {
  company: 'Company legal name',
  address: 'Registered address',
  email: 'Support email',
  phone: 'Support phone',
  hours: 'Support hours',
  grievanceOfficer: 'Grievance officer name',
  grievanceEmail: 'Grievance officer email',
  jurisdiction: 'City for courts',
};

/** A business detail from LEGAL, or a highlighted gap until it is filled in. */
export function Fill({ field }: { field: LegalField }) {
  const value = LEGAL[field];
  if (value) {
    if (field === 'email' || field === 'grievanceEmail') return <a href={'mailto:' + value}>{value}</a>;
    if (field === 'phone') return <a href={'tel:' + value.replace(/\s/g, '')}>{value}</a>;
    return <>{value}</>;
  }
  return <mark className="legal-gap">[{LABELS[field]}]</mark>;
}

export function PolicyFooter() {
  return (
    <footer className="policy-footer">
      <nav aria-label="Policies">
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/refunds">Refunds &amp; cancellation</Link>
        <Link href="/contact">Contact</Link>
      </nav>
      <p>© {new Date().getFullYear()} {LEGAL.company ?? LEGAL.brand}</p>
    </footer>
  );
}

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  const missing = missingLegalFields();
  return (
    <main className="storefront legal">
      <header className="cart-header">
        <div className="cart-title home-title"><h1>{title}</h1></div>
        <div className="store-scallop" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <span key={index} />)}</div>
      </header>
      <div className="status-body">
        {missing.length > 0 && (
          <p className="legal-draft" role="note">
            Draft: {missing.length} business detail{missing.length === 1 ? '' : 's'} still to fill in (highlighted below), then have
            the wording reviewed before going live.
          </p>
        )}
        <article className="status-card legal-body">
          <p className="status-kicker">Last updated {LEGAL.lastUpdated}</p>
          {children}
        </article>
        <PolicyFooter />
      </div>
    </main>
  );
}
