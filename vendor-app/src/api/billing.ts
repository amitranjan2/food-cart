import { request } from './client';

export type VendorPlan = 'DAILY' | 'MONTHLY' | 'YEARLY';

export type VendorInvoice = {
  number: string;
  plan: VendorPlan;
  periodStart: string;
  periodEnd: string;
  chargeDays?: string[] | null;
  units: number;
  unitPrice: number;
  taxable: number;
  gstPercent: number;
  cgst: number;
  sgst: number;
  total: number;
  vendorGstin?: string | null;
  status: 'DUE' | 'PAID';
  issuedAt: string;
  dueOn: string;
  paidAt?: string | null;
  paymentRef?: string | null;
};

export type Billing = {
  billingOn: boolean;
  plan: VendorPlan;
  plans: { plan: VendorPlan; price: number; per: string }[];
  gstPercent: number;
  next: { plan: VendorPlan; from: string } | null;
  earliestSwitch: string;
  yearlyUntil: string | null;
  daysThisMonth?: number;
  thisMonthSoFar?: number;
  invoices: VendorInvoice[];
  due: number;
  payToUpi: string | null;
};

export function getBilling(token: string) {
  return request<Billing>('/api/vendor/me/billing', { token });
}

/** Takes effect on the 1st of next month, or after a running yearly term. */
export function choosePlan(token: string, plan: VendorPlan) {
  return request<Billing>('/api/vendor/me/plan', { method: 'PUT', token, body: { plan } });
}
