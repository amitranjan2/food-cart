'use client';

import type { Vendor } from '../../lib/api';

export function VendorInfo({ vendor }: { vendor: Vendor }) {
  return <h1>{vendor.name}</h1>;
}
