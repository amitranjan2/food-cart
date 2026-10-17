'use client';

import { useEffect, useState } from 'react';
import { request } from './api';

/** GET /api/auth/otp-delivery/{ref}: whether the login code reached WhatsApp (never "read"; nothing else). */
export type OtpDelivery = { state: 'WAITING' | 'DELIVERED' | 'FAILED'; message?: string };

const EVERY_MS = 3_000;
/** Delivery usually takes a few seconds; after a minute the "Didn't get it?" hint is the better help. */
const GIVE_UP_MS = 60_000;

/** Asks every few seconds whether the code with this reference arrived, until it did, failed, or a minute passed. */
export function useOtpDelivery(ref: string) {
  const [delivery, setDelivery] = useState<OtpDelivery | null>(null);

  useEffect(() => {
    setDelivery(null);
    if (!ref) return;
    let active = true;
    const started = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    const ask = () => {
      request<OtpDelivery>('/api/auth/otp-delivery/' + encodeURIComponent(ref))
        .then(next => {
          if (!active) return;
          setDelivery(next);
          if (next.state === 'WAITING' && Date.now() - started < GIVE_UP_MS) timer = setTimeout(ask, EVERY_MS);
        })
        .catch(() => {
          if (active && Date.now() - started < GIVE_UP_MS) timer = setTimeout(ask, EVERY_MS);
        });
    };
    timer = setTimeout(ask, EVERY_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [ref]);

  return delivery;
}
