import { useEffect, useRef, useState } from 'react';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import type { Order } from '../types';
import { indiaDay, orderDayKey, pagerDayKey } from '../utils/orderDay';

const CHIME = require('../../assets/sounds/new-order.wav');

/**
 * Watches the polled orders for ones that weren't there before. Orders for today chime and are announced in the
 * header; orders for a later day only raise the count on the next-day arrow (DatePager pops it).
 * The first load only records what's already there.
 */
export function useNewOrderAlert(orders: Order[], ready: boolean) {
  const player = useAudioPlayer(CHIME);
  const seen = useRef<Set<string> | null>(null);
  const [latest, setLatest] = useState<Order | null>(null);

  useEffect(() => {
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
    const today = pagerDayKey(indiaDay(0));
    const forToday = fresh.filter(order => orderDayKey(order) === today);
    if (forToday.length === 0) return;
    setLatest(forToday[forToday.length - 1]);
    player.seekTo(0).catch(() => {}).finally(() => player.play());
  }, [orders, ready, player]);

  // Gone once the vendor accepts or rejects it.
  const current = latest && orders.find(order => order.id === latest.id)?.status === 'PLACED' ? latest : null;
  return { latest: current, dismiss: () => setLatest(null) };
}
