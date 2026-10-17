'use client';

import { useEffect, useState } from 'react';
import { request } from './api';
import { LAUNCH_PRICING, type Pricing } from './bill';

/** The bill's rates and the ways to pay, from the API (cached for the page's life); the launch values until it answers. */
let cached: Promise<Pricing> | null = null;

export function usePricing() {
  const [pricing, setPricing] = useState<Pricing>(LAUNCH_PRICING);
  useEffect(() => {
    cached ??= request<Pricing>('/api/public/pricing').catch(() => {
      cached = null;
      return LAUNCH_PRICING;
    });
    let active = true;
    cached.then(next => active && setPricing(next.byMethod && next.methods?.length ? next : LAUNCH_PRICING));
    return () => {
      active = false;
    };
  }, []);
  return pricing;
}
