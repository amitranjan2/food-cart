'use client';

import { useCallback, useEffect, useState } from 'react';
import { request } from '../../lib/api';

const EARTH_KM = 6371;
/** Streets are longer than the straight line between two points. */
const ROAD_FACTOR = 1.35;
const WALKING_KMH = 4.5;
/** A two-wheeler or auto in city traffic. */
const RIDING_KMH = 20;
/** Up to this road distance a customer is assumed to walk (about 20 minutes). */
const WALKING_MAX_KM = 1.5;
const REFRESH_MS = 60_000;

export type Eta = { minutes: number; mode: 'walk' | 'ride'; km: number };

/** Straight-line distance between two GPS points, in km. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** A rough time to reach the stall from the straight-line distance; no routing service involved. */
export function estimate(straightKm: number): Eta {
  const road = straightKm * ROAD_FACTOR;
  const walking = road <= WALKING_MAX_KM;
  const minutes = walking ? (road / WALKING_KMH) * 60 : (road / RIDING_KMH) * 60;
  return { minutes: Math.max(1, Math.round(minutes)), mode: walking ? 'walk' : 'ride', km: Math.round(road * 10) / 10 };
}

type Kitchen = { open: boolean; hoursSet: boolean; servingNow: boolean; opensAt: string | null };

/** "20M" under an hour, "1.5H" above it: the big line of the pill. */
export function etaText(minutes: number) {
  return minutes < 60 ? `${minutes}M` : `${Math.round(minutes / 6) / 10}H`;
}

/** "OPENS 6 PM", "OPENS TOMORROW 6 PM" or "OPENS TUE 6 PM" from a server time like 2026-10-13T18:00 (India time). */
export function opensText(opensAt: string, nowIndia = new Date(Date.now() + 330 * 60_000)) {
  const [day, time] = opensAt.split('T');
  const [hour, minute] = time.split(':').map(Number);
  const clock = `${hour % 12 || 12}${minute ? ':' + String(minute).padStart(2, '0') : ''} ${hour < 12 ? 'AM' : 'PM'}`;
  const today = nowIndia.toISOString().slice(0, 10);
  const tomorrow = new Date(nowIndia.getTime() + 86_400_000).toISOString().slice(0, 10);
  if (day === today) return `OPENS ${clock}`;
  if (day === tomorrow) return `OPENS TOMORROW ${clock}`;
  const weekday = new Date(day + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }).toUpperCase();
  return `OPENS ${weekday} ${clock}`;
}

/**
 * The kitchen's state at the top of the store, and a link to its place on the map:
 * - switched off in the vendor app: ON HOLD
 * - outside opening hours: CLOSED, with when it opens
 * - serving: how long it takes to reach the stall ("20M", "WALK"), from the browser's position (used here only, never sent
 *   to our servers). Without a position it says OPEN and still opens the map.
 */
export function StoreEta({ slug, lat, lng, status }: { slug: string; lat?: number | null; lng?: number | null; status: 'OPEN' | 'CLOSED' }) {
  const [kitchen, setKitchen] = useState<Kitchen | null>(null);
  const [eta, setEta] = useState<Eta | null>(null);
  const known = lat != null && lng != null;

  useEffect(() => {
    let active = true;
    const load = () => {
      if (document.visibilityState === 'hidden') return;
      request<Kitchen>('/api/public/vendors/' + slug + '/slots')
        .then(next => active && setKitchen(next))
        .catch(() => {});
    };
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    document.addEventListener('visibilitychange', load);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
    };
  }, [slug]);

  const locate = useCallback(() => {
    if (!known || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      position => setEta(estimate(distanceKm({ lat: position.coords.latitude, lng: position.coords.longitude }, { lat: lat as number, lng: lng as number }))),
      () => {},
      { maximumAge: 5 * 60_000, timeout: 10_000 },
    );
  }, [known, lat, lng]);

  // The position only matters while the kitchen is serving, so ask once it is.
  const serving = kitchen ? kitchen.open && kitchen.servingNow : status === 'OPEN';
  useEffect(() => {
    if (serving) locate();
  }, [serving, locate]);

  const onHold = kitchen ? !kitchen.open : status === 'CLOSED';
  let tone: 'hold' | 'closed' | 'open';
  let big: string;
  let small: string;
  if (onHold) {
    tone = 'hold';
    big = 'ON HOLD';
    small = 'BACK SOON';
  } else if (kitchen && !kitchen.servingNow) {
    tone = 'closed';
    big = 'CLOSED';
    small = kitchen.opensAt ? opensText(kitchen.opensAt) : 'NO HOURS SET';
  } else if (eta) {
    tone = 'open';
    big = etaText(eta.minutes);
    small = eta.mode === 'walk' ? 'WALK' : 'RIDE';
  } else {
    tone = 'open';
    big = 'OPEN';
    small = known ? 'MAP' : 'NOW';
  }
  const label = `${big}, ${small.toLowerCase()}${known ? '. Opens the stall in maps' : ''}`;
  const body = (
    <>
      <b>{big}</b>
      <small>{small}</small>
    </>
  );
  if (!known) return <div className={'kitchen kitchen-' + tone} role="status" aria-label={label}>{body}</div>;
  return (
    <a
      className={'kitchen kitchen-' + tone}
      href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={eta ? `About ${eta.km} km away. A rough estimate. Tap for the map.` : 'Tap for the map'}
    >
      {body}
    </a>
  );
}
