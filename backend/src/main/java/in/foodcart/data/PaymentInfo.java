package in.foodcart.data;

import java.time.Instant;

/** The online payment behind an order. Kept per order so a refund always goes to the gateway that took the money. */
public class PaymentInfo {
  public enum Status { PENDING, PAID, FAILED, REFUND_PENDING, REFUNDED }

  public String gateway;
  public String gatewayOrderId;
  public String paymentId;
  public Status status = Status.PENDING;
  /** Unpaid orders expire at this time. */
  public Instant expiresAt;
  public Instant paidAt;
  public String refundId;
  public Instant refundedAt;
  public String note;
}
