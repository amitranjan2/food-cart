export type VendorStatus = 'OPEN' | 'CLOSED';

export type Weekday = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

/** "HH:mm" on the half hour, India time. closes at or before opens means the day ends after midnight. */
export type OpeningHours = { day: Weekday; opens: string; closes: string };

export type Vendor = {
  id: string;
  slug: string;
  mobile: string;
  name: string;
  description?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  themeColor?: string;
  status: VendorStatus;
  openingHours?: OpeningHours[];
  createdAt?: string;
  updatedAt?: string;
};
