'use client';

import { useEffect, useRef, useState } from 'react';
import { request } from './api';

/** GET /api/auth/methods: which ways to sign in work right now. */
export type LoginMethods = { otp: boolean; whatsappLogin: boolean };

/** POST /api/auth/{role}/wa-login: what to send, where, and the secret to poll with. */
export type WaLoginStart = { secret: string; code: string; text: string; link: string; number: string; expiresAt: string; qrSvg: string };

export type WaLoginState = 'WAITING' | 'SIGNED_IN' | 'WRONG_NUMBER' | 'EXPIRED';

const EVERY_MS = 2_000;

/**
 * Watches a started WhatsApp login until the customer's message arrives (signed in), the code expires, or it's
 * cancelled. Asks again straight away when the tab comes back into view, i.e. when the customer returns from WhatsApp.
 */
export function useWhatsAppLogin(start: WaLoginStart | null, onSignedIn: (token: string) => void) {
  const [state, setState] = useState<WaLoginState | null>(null);
  const signedIn = useRef(onSignedIn);
  signedIn.current = onSignedIn;

  useEffect(() => {
    setState(start ? 'WAITING' : null);
    if (!start) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const expires = new Date(start.expiresAt).getTime();
    const ask = () => {
      clearTimeout(timer);
      request<{ state: WaLoginState; token?: string }>('/api/auth/wa-login/' + encodeURIComponent(start.secret))
        .then(next => {
          if (!active) return;
          setState(next.state);
          if (next.state === 'SIGNED_IN' && next.token) signedIn.current(next.token);
          else if ((next.state === 'WAITING' || next.state === 'WRONG_NUMBER') && Date.now() < expires) timer = setTimeout(ask, EVERY_MS);
          else if (Date.now() >= expires) setState('EXPIRED');
        })
        .catch(() => {
          if (active && Date.now() < expires) timer = setTimeout(ask, EVERY_MS);
        });
    };
    const back = () => document.visibilityState === 'visible' && ask();
    timer = setTimeout(ask, EVERY_MS);
    document.addEventListener('visibilitychange', back);
    return () => {
      active = false;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', back);
    };
  }, [start]);

  return state;
}

/** The sign-in methods, asked once per page load; OTP only until the API answers (the old behaviour). */
export function useLoginMethods() {
  const [methods, setMethods] = useState<LoginMethods>({ otp: true, whatsappLogin: false });
  useEffect(() => {
    let active = true;
    request<LoginMethods>('/api/auth/methods').then(next => active && setMethods(next)).catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return methods;
}
