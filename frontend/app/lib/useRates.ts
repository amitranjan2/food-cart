'use client';

import { useEffect, useState } from 'react';
import { request } from './api';
import { LAUNCH_RATES, type Rates } from './bill';

/** The bill's rates from the API (cached for the page's life); the launch rates until it answers. */
let cached: Promise<Rates> | null = null;

export function useRates() {
  const [rates, setRates] = useState<Rates>(LAUNCH_RATES);
  useEffect(() => {
    cached ??= request<Rates>('/api/public/pricing').catch(() => {
      cached = null;
      return LAUNCH_RATES;
    });
    let active = true;
    cached.then(next => active && setRates(next));
    return () => {
      active = false;
    };
  }, []);
  return rates;
}
