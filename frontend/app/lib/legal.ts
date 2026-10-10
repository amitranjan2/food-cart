/**
 * The business details the policy pages print. Fill every null before going live: the payment gateway checks these
 * pages, and Indian law requires a named grievance officer. While anything is null the pages show a "Draft" banner
 * and the gap is highlighted.
 */
export const LEGAL = {
  /** The name customers see. FoodCart vs Supr-Mama is still open (tracker S4.6). */
  brand: 'FoodCart',
  /** Registered name, e.g. "Example Foods Private Limited" or the proprietor's name for a sole proprietorship. */
  company: null as string | null,
  /** Registered office address, one line. */
  address: null as string | null,
  /** Support inbox customers and vendors write to. */
  email: null as string | null,
  /** Support phone with country code, e.g. "+91 98765 43210". */
  phone: null as string | null,
  /** Support hours, e.g. "10 AM – 8 PM, Monday to Saturday". */
  hours: null as string | null,
  /** Grievance officer (IT Rules 2021, DPDP Act 2023): a named person with an email. */
  grievanceOfficer: null as string | null,
  grievanceEmail: null as string | null,
  /** City whose courts handle disputes, e.g. "Bengaluru". */
  jurisdiction: null as string | null,
  /** Change whenever a policy's wording changes. */
  lastUpdated: '10 October 2026',
};

export type LegalField = Exclude<keyof typeof LEGAL, 'brand' | 'lastUpdated'>;

export function missingLegalFields() {
  return (Object.keys(LEGAL) as (keyof typeof LEGAL)[]).filter(key => LEGAL[key] === null) as LegalField[];
}
