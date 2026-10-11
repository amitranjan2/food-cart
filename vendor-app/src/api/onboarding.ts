import { request } from './client';
import type { Vendor, VendorReview } from '../types';

export type OnboardingStepKey = 'BASICS' | 'LOCATION' | 'HOURS' | 'DISHES' | 'BUSINESS';
export type OnboardingStep = { key: OnboardingStepKey; label: string; required: boolean; done: boolean };
export type OnboardingStatus = { review: VendorReview; reviewNote: string | null; steps: OnboardingStep[]; ready: boolean };

export function getOnboarding(token: string) {
  return request<OnboardingStatus>('/api/vendor/me/onboarding', { token });
}

export function submitOnboarding(token: string) {
  return request<OnboardingStatus>('/api/vendor/me/onboarding/submit', { method: 'POST', token });
}

/** slug: the store link; it can't change once the stall is live. */
export function putBasics(token: string, basics: { name: string; slug: string; theme: string }) {
  return request<Vendor>('/api/vendor/me/basics', { method: 'PUT', token, body: basics });
}

/** As the API returns it: PAN and account number masked. */
export type Business = {
  fssai: string | null;
  pan: string | null;
  payoutMethod: 'UPI' | 'BANK' | null;
  upiId: string | null;
  accountName: string | null;
  accountNumber: string | null;
  ifsc: string | null;
  complete: boolean;
};

/** Leave a field out to keep what is saved. */
export type BusinessInput = Partial<Record<'fssai' | 'pan' | 'payoutMethod' | 'upiId' | 'accountName' | 'accountNumber' | 'ifsc', string>>;

export function getBusiness(token: string) {
  return request<Business>('/api/vendor/me/business', { token });
}

export function putBusiness(token: string, input: BusinessInput) {
  return request<Business>('/api/vendor/me/business', { method: 'PUT', token, body: input });
}
