import { request } from './client';
import type { OpeningHours, Vendor, VendorStatus } from '../types';

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

export function putVendorProfile(token: string, vendor: Vendor) {
  return request<Vendor>('/api/vendor/me/profile', {
    method: 'PUT',
    token,
    body: vendor,
  });
}

/** Replaces the weekly hours; a day left out is closed. */
export function putVendorHours(token: string, openingHours: OpeningHours[]) {
  return request<Vendor>('/api/vendor/me/hours', {
    method: 'PUT',
    token,
    body: { openingHours },
  });
}
