export type VendorStatus = 'OPEN' | 'CLOSED';

export type Weekday = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

/** One opening slot: "HH:mm" on the half hour, India time; closes may be "24:00" (midnight). A day can have several. */
export type OpeningHours = { day: Weekday; opens: string; closes: string };

/** Where the stall is: the GPS point set at the stall plus the written address parts. */
export type VendorLocation = { lat: number; lng: number; shop?: string; landmark?: string; area: string };

/** A storefront colour pair: light for the header, dark for text and buttons. */
export type StoreTheme = { key: string; name: string; light: string; dark: string };

export type Vendor = {
  id: string;
  slug: string;
  mobile: string;
  name: string;
  description?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  /** StoreTheme key, e.g. "SKY". */
  theme?: string;
  location?: VendorLocation | null;
  status: VendorStatus;
  openingHours?: OpeningHours[];
  createdAt?: string;
  updatedAt?: string;
};
