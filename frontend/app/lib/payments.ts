import { request } from './api';

/** What the server returns for a new order's payment (PaymentService.Started). */
export type StartedPayment = { gateway: string; gatewayOrderId: string; data: Record<string, unknown> };

export type CheckoutOutcome = 'success' | 'failure' | 'closed';

/**
 * Opens the active gateway's checkout. Each gateway gets a branch here (Cashfree or Razorpay load their own script).
 * The outcome only decides what to show next: whether an order is paid is decided by the server's verified webhook.
 */
export async function openCheckout(payment: StartedPayment, showTestCheckout: () => Promise<CheckoutOutcome>): Promise<CheckoutOutcome> {
  if (payment.gateway === 'fake') {
    const outcome = await showTestCheckout();
    if (outcome !== 'closed') {
      await request(`/api/dev/payments/${payment.gatewayOrderId}/${outcome}`, { method: 'POST' });
    }
    return outcome;
  }
  throw new Error('Online payment is not set up yet.');
}
