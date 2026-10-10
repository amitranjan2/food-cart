import { request } from './client';
import type { OpeningHours, StoreTheme, Vendor, VendorLocation, VendorStatus } from '../types';

export function getVendorMe(token: string) {
  return request<Vendor>('/api/vendor/me', { token });
}

export function patchVendorStatus(token: string, status: VendorStatus) {
  return request<Vendor>('/api/vendor/me/status', {
    method: 'PATCH',
    token,
    body: { status },
  });
}

export type ProfileInput = { name: string; description?: string | null; theme: string; location?: VendorLocation | null };

export function putVendorProfile(token: string, profile: ProfileInput) {
  return request<Vendor>('/api/vendor/me/profile', {
    method: 'PUT',
    token,
    body: profile,
  });
}

export function getThemes(token: string) {
  return request<StoreTheme[]>('/api/vendor/themes', { token });
}

/** A place from the map lookup (OpenStreetMap, through our API). */
export type Place = { area: string; lat: number; lng: number };

export function reverseGeocode(token: string, lat: number, lng: number) {
  return request<Place>(`/api/vendor/geo/reverse?lat=${lat}&lng=${lng}`, { token });
}

export function searchPlaces(token: string, query: string) {
  return request<Place[]>(`/api/vendor/geo/search?q=${encodeURIComponent(query)}`, { token });
}

/** Replaces the weekly hours; a day left out is closed. */
export function putVendorHours(token: string, openingHours: OpeningHours[]) {
  return request<Vendor>('/api/vendor/me/hours', {
    method: 'PUT',
    token,
    body: { openingHours },
  });
}
