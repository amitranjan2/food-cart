import { request } from './api';

/**
 * Vendors this customer has opened (by QR code or link), most recent first. Kept in the browser so the home page
 * works before the customer verifies their number, and copied to their account once they do.
 */
const KEY = 'foodcart.vendors';

export function savedVendorSlugs(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((slug): slug is string => typeof slug === 'string') : [];
  } catch {
    return [];
  }
}

export function saveVendor(slug: string, token?: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify([slug, ...savedVendorSlugs().filter(saved => saved !== slug)]));
  } catch {
    // Storage blocked: the vendor is still saved on the account below when signed in.
  }
  if (token) request('/api/customers/me/vendors', { method: 'POST', body: JSON.stringify({ slug }) }, token).catch(() => {});
}

/** After verification, copy vendors opened while signed out onto the account. */
export async function syncSavedVendors(token: string) {
  // Oldest first and one at a time, so the account keeps the same most-recent-first order as this phone.
  for (const slug of [...savedVendorSlugs()].reverse()) {
    await request('/api/customers/me/vendors', { method: 'POST', body: JSON.stringify({ slug }) }, token).catch(() => {});
  }
}
