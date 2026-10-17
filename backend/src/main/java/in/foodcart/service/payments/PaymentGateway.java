package in.foodcart.service.payments;

import in.foodcart.data.PaymentInfo;

import java.math.BigDecimal;
import java.util.Map;

/**
 * One payment provider (Cashfree, Razorpay, or the local fake). Exactly one is active, chosen by
 * app.payments.gateway. Everything else about payments (statuses, expiry, refund rules) lives in PaymentService.
 */
public interface PaymentGateway {
  /** Short id used in config, webhook URLs and stored payments, e.g. "cashfree". */
  String name();

  /**
   * Creates a payment for the amount at the gateway. Returns what the browser needs to open checkout. Use orderId as
   * the gateway's receipt/reference: the order has no number until it is paid.
   */
  Checkout create(String orderId, BigDecimal amount, String customerName, String customerMobile);

  /** Checks the webhook is genuinely from the gateway (throws SecurityException if not) and translates it. Header names are lower case. */
  Event parseWebhook(String rawBody, Map<String, String> headers);

  /** Starts a full refund. Some gateways finish later and report it by webhook. */
  Refund refund(PaymentInfo payment, BigDecimal amount);

  record Checkout(String gatewayOrderId, Map<String, Object> data) {}

  enum EventType { PAYMENT_CAPTURED, PAYMENT_FAILED, REFUND_PROCESSED, IGNORED }

  record Event(EventType type, String gatewayOrderId, String paymentId, BigDecimal amount) {}

  record Refund(String refundId, boolean completed) {}
}
