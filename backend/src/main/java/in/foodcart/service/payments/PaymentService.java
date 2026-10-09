package in.foodcart.service.payments;

import in.foodcart.data.*;
import in.foodcart.domain.OrderStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;

/**
 * Payment rules, independent of the gateway: an order reaches the vendor only after a verified "captured" webhook
 * for the full amount; unpaid orders expire; rejected orders and late payments are refunded.
 */
@Service
public class PaymentService {
  public static final Duration PAY_WITHIN = Duration.ofMinutes(15);
  private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

  private final PaymentGateway gateway;
  private final OrderRepository orders;
  private final HistoryRepository history;
  /** Replaced in tests. */
  Clock clock = Clock.systemUTC();

  public PaymentService(ObjectProvider<PaymentGateway> gateways, OrderRepository orders, HistoryRepository history) {
    this.gateway = gateways.getIfAvailable();
    if (this.gateway == null) {
      throw new IllegalStateException(
          "No payment gateway is configured, so orders cannot be paid. "
              + "Run with the 'local' profile for development, or configure a gateway for production.");
    }
    this.orders = orders;
    this.history = history;
  }

  /** What the browser needs to open the active gateway's checkout. */
  public record Started(String gateway, String gatewayOrderId, Map<String, Object> data) {}

  /** Creates the gateway payment for a new PAYMENT_PENDING order, always for the server's total. */
  public Started start(OrderEntity o) {
    PaymentGateway.Checkout checkout = gateway.create(o.id, o.orderNumber, o.total, o.customerName, o.customerMobile);
    PaymentInfo p = new PaymentInfo();
    p.gateway = gateway.name();
    p.gatewayOrderId = checkout.gatewayOrderId();
    p.expiresAt = Instant.now(clock).plus(PAY_WITHIN);
    o.payment = p;
    orders.save(o);
    return new Started(p.gateway, p.gatewayOrderId, checkout.data());
  }

  public void handleWebhook(String gatewayName, String rawBody, Map<String, String> headers) {
    if (!gateway.name().equals(gatewayName)) throw new IllegalArgumentException("Unknown payment gateway");
    apply(gateway.parseWebhook(rawBody, headers));
  }

  /** Applies a verified gateway event. Safe to receive the same event more than once. */
  void apply(PaymentGateway.Event event) {
    if (event.type() == PaymentGateway.EventType.IGNORED) return;
    OrderEntity o = orders.findByPayment_GatewayOrderId(event.gatewayOrderId()).orElse(null);
    if (o == null) {
      log.warn("Webhook for unknown gateway order {}", event.gatewayOrderId());
      return;
    }
    PaymentInfo p = o.payment;
    switch (event.type()) {
      case PAYMENT_CAPTURED -> {
        if (p.status != PaymentInfo.Status.PENDING && p.status != PaymentInfo.Status.FAILED) return; // already handled
        p.paymentId = event.paymentId();
        p.paidAt = Instant.now(clock);
        p.status = PaymentInfo.Status.PAID;
        if (event.amount() == null || event.amount().compareTo(o.total) != 0) {
          p.note = "Paid " + event.amount() + " but the order total is " + o.total;
          o.status = OrderStatus.EXPIRED; // never reaches the vendor
          refund(o);
        } else if (o.status == OrderStatus.PAYMENT_PENDING) {
          o.status = OrderStatus.PLACED;
          recordVisit(o);
        } else {
          // Paid after the order expired: the vendor never saw it, so give the money back.
          p.note = "Paid after the order expired";
          refund(o);
        }
        orders.save(o);
      }
      case PAYMENT_FAILED -> {
        if (p.status != PaymentInfo.Status.PENDING) return;
        p.status = PaymentInfo.Status.FAILED; // the order stays PAYMENT_PENDING until it expires
        orders.save(o);
      }
      case REFUND_PROCESSED -> {
        if (p.status != PaymentInfo.Status.REFUND_PENDING) return;
        p.status = PaymentInfo.Status.REFUNDED;
        p.refundedAt = Instant.now(clock);
        orders.save(o);
      }
      default -> { }
    }
  }

  /** Called when a vendor rejects (or later cancels) an order. The caller saves the order. */
  public void refundIfPaid(OrderEntity o) {
    if (o.payment != null && o.payment.status == PaymentInfo.Status.PAID) refund(o);
  }

  private void refund(OrderEntity o) {
    PaymentInfo p = o.payment;
    PaymentGateway.Refund r = gateway.refund(p, o.total);
    p.refundId = r.refundId();
    p.status = r.completed() ? PaymentInfo.Status.REFUNDED : PaymentInfo.Status.REFUND_PENDING;
    if (r.completed()) p.refundedAt = Instant.now(clock);
  }

  @Scheduled(fixedDelay = 60_000)
  public void expireUnpaid() {
    for (OrderEntity o : orders.findByStatusAndPayment_ExpiresAtBefore(OrderStatus.PAYMENT_PENDING, Instant.now(clock))) {
      if (o.payment.status == PaymentInfo.Status.PAID) continue;
      o.status = OrderStatus.EXPIRED;
      orders.save(o);
    }
  }

  private void recordVisit(OrderEntity o) {
    CustomerVendorHistoryEntity h = history.findByCustomerIdAndVendorId(o.customerId, o.vendorId).orElseGet(() -> {
      CustomerVendorHistoryEntity x = new CustomerVendorHistoryEntity();
      x.customerId = o.customerId;
      x.vendorId = o.vendorId;
      return x;
    });
    h.totalOrders++;
    h.lastOrderedAt = Instant.now(clock);
    history.save(h);
  }
}
