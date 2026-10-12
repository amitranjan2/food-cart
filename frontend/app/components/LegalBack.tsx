'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

/** The policy pages (the footer links to them). */
const POLICY_PATHS = ['/terms', '/privacy', '/refunds', '/contact', '/vendor-terms'];

/**
 * The browser doesn't update document.referrer when the app moves between pages, so the footer remembers the page the
 * customer was on (the store or the home screen) when they open a policy page, and the back arrow returns there.
 * Opening one policy page from another keeps the first page remembered. It lives in memory, so a policy page opened
 * directly (a typed address, a link from outside) or reloaded has nothing remembered and goes back to the home screen.
 */
let cameFrom: string | null = null;

function remember() {
  const path = window.location.pathname;
  if (!POLICY_PATHS.includes(path)) cameFrom = path + window.location.search;
}

/** The footer's policy links. */
export function PolicyNav({ children }: { children: ReactNode }) {
  return (
    <nav aria-label="Policies" onClick={event => (event.target as HTMLElement).closest('a') && remember()}>
      {children}
    </nav>
  );
}

/** Back arrow on the policy pages: to the store or the home screen the customer came from, else the home screen. */
export function LegalBack() {
  const router = useRouter();
  function goBack() {
    // Only a page of this app, never a policy page or an outside address.
    const ok = cameFrom && cameFrom.startsWith('/') && !cameFrom.startsWith('//') && !POLICY_PATHS.includes(cameFrom.split('?')[0]);
    router.push(ok ? (cameFrom as string) : '/');
  }
  return (
    <button type="button" className="cart-back" onClick={goBack} aria-label="Back to home">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M15 5 8 12l7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
