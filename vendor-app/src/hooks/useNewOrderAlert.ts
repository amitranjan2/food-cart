import { useEffect, useRef, useState } from 'react';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import type { Order } from '../types';

const CHIME = require('../../assets/sounds/new-order.wav');

/**
 * Chimes when a new paid order arrives (one the vendor hasn't seen in this session) and keeps the latest one for a
 * banner. Orders already waiting when the app opens are shown but don't chime.
 */
export function useNewOrderAlert(orders: Order[], ready: boolean) {
  const player = useAudioPlayer(CHIME);
  const seen = useRef<Set<string> | null>(null);
  const [latest, setLatest] = useState<Order | null>(null);

  useEffect(() => {
    // A vendor with the phone on silent still needs to hear new orders.
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!ready) return;
    const placed = orders.filter(order => order.status === 'PLACED');
    if (seen.current === null) {
      seen.current = new Set(placed.map(order => order.id));
      return;
    }
    const fresh = placed.filter(order => !seen.current?.has(order.id));
    if (fresh.length === 0) return;
    for (const order of fresh) seen.current.add(order.id);
    setLatest(fresh[fresh.length - 1]);
    player
      .seekTo(0)
      .catch(() => {})
      .finally(() => player.play());
  }, [orders, ready, player]);

  // The banner goes away once that order has been accepted or rejected.
  const current = latest && orders.find(order => order.id === latest.id)?.status === 'PLACED' ? latest : null;
  return { latest: current, dismiss: () => setLatest(null) };
}
