'use client';

import { useCallback, useEffect, useState } from 'react';

const EARTH_KM = 6371;
/** Streets are longer than the straight line between two points. */
const ROAD_FACTOR = 1.35;
const WALKING_KMH = 4.5;
/** A two-wheeler or auto in city traffic. */
const RIDING_KMH = 20;
/** Up to this road distance a customer is assumed to walk (about 20 minutes). */
const WALKING_MAX_KM = 1.5;

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

/**
 * "12 Min walk" at the top of the store: roughly how long it takes to reach the stall from where the customer is. The
 * position comes from the browser (it asks first) and is used here only; nothing is sent to our servers. Until they tap
 * "How far?" (or if they already allowed it before) there is no number, rather than a made-up one.
 */
export function StoreEta({ lat, lng }: { lat?: number | null; lng?: number | null }) {
  const [eta, setEta] = useState<Eta | null>(null);
  const [state, setState] = useState<'idle' | 'asking' | 'ready' | 'failed'>('idle');
  const known = lat != null && lng != null;

  const locate = useCallback(() => {
    if (!known || !navigator.geolocation) return setState('failed');
    setState('asking');
    navigator.geolocation.getCurrentPosition(
      position => {
        setEta(estimate(distanceKm({ lat: position.coords.latitude, lng: position.coords.longitude }, { lat: lat as number, lng: lng as number })));
        setState('ready');
      },
      () => setState('failed'),
      { maximumAge: 5 * 60_000, timeout: 10_000 },
    );
  }, [known, lat, lng]);

  // Already allowed on an earlier visit: no need to ask again.
  useEffect(() => {
    if (!known || !navigator.geolocation || !navigator.permissions) return;
    let active = true;
    navigator.permissions
      .query({ name: 'geolocation' })
      .then(status => active && status.state === 'granted' && locate())
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [known, locate]);

  if (!known || state === 'failed') return null;
  if (eta) {
    return (
      <div className="store-eta" role="status" aria-label={`About ${eta.minutes} minutes ${eta.mode === 'walk' ? 'on foot' : 'by road'}, ${eta.km} km`} title={`About ${eta.km} km away. A rough estimate.`}>
        <span className="store-eta-num">{eta.minutes}</span>
        <span className="store-eta-unit">Min {eta.mode}</span>
      </div>
    );
  }
  return (
    <button type="button" className="store-eta store-eta-ask" onClick={locate} disabled={state === 'asking'} aria-label="Show how far this stall is from you">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="12" cy="9.5" r="2.5" stroke="currentColor" strokeWidth="2" />
      </svg>
      <span className="store-eta-unit">{state === 'asking' ? '…' : 'How far?'}</span>
    </button>
  );
}
