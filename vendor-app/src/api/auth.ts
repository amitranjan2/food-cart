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

/** Which ways to sign in work right now (codes need an approved WhatsApp template; WhatsApp login needs the webhook). */
export type LoginMethods = { otp: boolean; whatsappLogin: boolean };

export function loginMethods() {
  return request<LoginMethods>('/api/auth/methods');
}

/** "Login with WhatsApp": the vendor sends `text` to `number` from their own phone; we poll with `secret`. */
export type WaLoginStart = { secret: string; code: string; text: string; link: string; number: string; expiresAt: string; qrSvg: string };
export type WaLoginState = 'WAITING' | 'SIGNED_IN' | 'WRONG_NUMBER' | 'EXPIRED';

export function startVendorWaLogin(mobile: string) {
  return request<WaLoginStart>('/api/auth/vendor/wa-login', { method: 'POST', body: { mobile } });
}

export function waLoginState(secret: string) {
  return request<{ state: WaLoginState; token?: string }>('/api/auth/wa-login/' + encodeURIComponent(secret));
}
