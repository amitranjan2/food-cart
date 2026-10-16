import { request } from './client';
import type { AuthResponse, VerifyOtpRequest } from '../types';

export function requestVendorOtp(mobile: string) {
  // ref: lets the login screen ask whether WhatsApp delivered this code (otpDelivery).
  return request<{ sent: boolean; ref?: string }>('/api/auth/vendor/request-otp', {
    method: 'POST',
    body: { mobile },
  });
}

export function verifyVendorOtp(body: VerifyOtpRequest) {
  return request<AuthResponse>('/api/auth/vendor/verify-otp', {
    method: 'POST',
    body,
  });
}

/** Whether WhatsApp delivered a login code: never "read", and nothing about other numbers. */
export type OtpDelivery = { state: 'WAITING' | 'DELIVERED' | 'FAILED'; message?: string };

export function otpDelivery(ref: string) {
  return request<OtpDelivery>('/api/auth/otp-delivery/' + encodeURIComponent(ref));
}
