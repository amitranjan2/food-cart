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

/** The GST on food the stall took in cash for one month, which it passes to us (tracker S2.19). Not a tax invoice. */
export type VendorCollection = {
  number: string;
  periodStart: string;
  periodEnd: string;
  orders: { orderNumber: number; collectedOn: string; invoiceNumber?: string | null; itemTotal: number; foodGst: number }[];
  itemTotal: number;
  total: number;
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
  /** GST on pay-at-stall orders, one statement per month. */
  collections?: VendorCollection[];
  /** GST on this month's collected pay-at-stall orders so far (on next month's statement). */
  collectionThisMonth?: number;
  /** Invoices and statements still to pay. */
  due: number;
  payToUpi: string | null;
  /** Who issues the invoices (our company). */
  seller?: { name: string; address: string; gstin: string | null; sac: string | null };
};

export function getBilling(token: string) {
  return request<Billing>('/api/vendor/me/billing', { token });
}

/** Takes effect on the 1st of next month, or after a running yearly term. */
export function choosePlan(token: string, plan: VendorPlan) {
  return request<Billing>('/api/vendor/me/plan', { method: 'PUT', token, body: { plan } });
}
