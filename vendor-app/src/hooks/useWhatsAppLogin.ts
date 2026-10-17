import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { waLoginState, type WaLoginStart, type WaLoginState } from '../api/auth';

const EVERY_MS = 2_000;

/**
 * Watches a started WhatsApp login until the vendor's message arrives (signed in), the code expires, or it's
 * cancelled. Asks again straight away when the app comes back to the foreground, i.e. back from WhatsApp.
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
      waLoginState(start.secret)
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
    timer = setTimeout(ask, EVERY_MS);
    const subscription = AppState.addEventListener('change', next => next === 'active' && ask());
    return () => {
      active = false;
      clearTimeout(timer);
      subscription.remove();
    };
  }, [start]);

  return state;
}
