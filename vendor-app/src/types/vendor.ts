export type VendorStatus = 'OPEN' | 'CLOSED';

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
  createdAt?: string;
  updatedAt?: string;
};
