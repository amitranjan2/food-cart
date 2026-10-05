import { request } from './client';
import type { AuthResponse, VerifyOtpRequest } from '../types';

export function requestVendorOtp(mobile: string) {
  return request<{ sent: boolean; message: string }>('/api/auth/vendor/request-otp', {
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
