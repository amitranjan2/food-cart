/**
 * The business details the policy pages print. Fill every null before going live: the payment gateway checks these
 * pages, and Indian law requires a named grievance officer. While anything is null the pages show a "Draft" banner
 * and the gap is highlighted.
 */
export const LEGAL = {
  /** The name customers see (decided Oct 10, tracker S4.6). */
  brand: 'Supr-Mama',
  /** The storefront's address. */
  domain: 'suprmama.in',
  /** Registered name, e.g. "Example Foods Private Limited" or the proprietor's name for a sole proprietorship. */
  company: 'Crestway Properties Private Limited' as string | null,
  /** Registered office address, one line. */
  address: 'C/O Manju Devi, Ganesh Colony, Narnaul, Haryana 123001' as string | null,
  /** Support inbox customers and vendors write to. */
  email: 'tech@suprmama.in' as string | null,
  /** Support phone with country code, e.g. "+91 98765 43210". */
  phone: '+91 86708 47013' as string | null,
  /** Support hours, e.g. "10 AM – 8 PM, Monday to Saturday". */
  hours: '24×7' as string | null,
  /** Grievance officer (IT Rules 2021, DPDP Act 2023): a named person with an email. */
  grievanceOfficer: 'Aakash Yadav' as string | null,
  grievanceEmail: 'tech@suprmama.in' as string | null,
  /** City whose courts handle disputes, e.g. "Bengaluru". */
  jurisdiction: 'Gurugram, Haryana' as string | null,
  /** GSTIN of the company: required on tax invoices; the e-commerce operator must register whatever its turnover. */
  gstin: '06AAMCC1614M1ZL' as string | null,
  /** State of the GST registration and of the stalls (place of supply), e.g. "Haryana (06)". */
  gstState: 'Haryana (06)' as string | null,
  /** SAC for platform charges on the customer's invoice; confirm with a CA (the food is SAC 996331). */
  platformChargesSac: null as string | null,
  /** Vendor Terms: plan prices before GST. Keep in step with BILLING_DAILY/MONTHLY/YEARLY on the API. */
  vendorPlans: { daily: '₹100', monthly: '₹2,500', yearly: '₹25,000' },
  /** Vendor Terms: when payouts happen, e.g. "within 2 working days of the order being handed over". */
  payoutSchedule: 'every week, for the orders handed over in the previous week (Monday to Sunday)' as string | null,
  /** Days after a vendor closes their stall within which their licence, PAN and payout details are deleted. */
  vendorDeletionDays: '30' as string | null,
  /** Change whenever a policy's wording changes. */
  lastUpdated: '17 October 2026',
};

export type LegalField = Exclude<keyof typeof LEGAL, 'brand' | 'domain' | 'lastUpdated' | 'vendorPlans'>;

/** Printed only on tax invoices, which show their own gaps; they don't make a policy page a draft. */
const INVOICE_ONLY: (keyof typeof LEGAL)[] = ['gstin', 'platformChargesSac'];

export function missingLegalFields() {
  return (Object.keys(LEGAL) as (keyof typeof LEGAL)[]).filter(key => LEGAL[key] === null && !INVOICE_ONLY.includes(key)) as LegalField[];
}
