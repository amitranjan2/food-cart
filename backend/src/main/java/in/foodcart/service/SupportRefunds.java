package in.foodcart.service;

import in.foodcart.data.OrderEntity;
import in.foodcart.data.OrderRepository;
import in.foodcart.data.PaymentInfo;
import in.foodcart.data.SupportActionEntity;
import in.foodcart.data.SupportActionRepository;
import in.foodcart.data.VendorEntity;
import in.foodcart.data.VendorRepository;
import in.foodcart.domain.OrderStatus;
import in.foodcart.service.payments.PaymentService;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * Support cancels and refunds an order the stall can't make (tracker S3.7). Vendors can't cancel once they accept
 * (decided Oct 11), so this is the only way back for the customer's money. Used by ops/refund-order.sh after support
 * has spoken to the stall.
 */
@Service
public class SupportRefunds {
  /** Orders still waiting to be handed over. Completed ones are disputes for the payment gateway's dashboard. */
  static final Set<OrderStatus> REFUNDABLE = EnumSet.of(OrderStatus.PLACED, OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY);

  private final VendorRepository vendors;
  private final OrderRepository orders;
  private final PaymentService payments;
  private final SupportActionRepository actions;
  /** Replaced in tests. */
  Clock clock = Clock.systemUTC();

  public SupportRefunds(VendorRepository vendors, OrderRepository orders, PaymentService payments, SupportActionRepository actions) {
    this.vendors = vendors;
    this.orders = orders;
    this.payments = payments;
    this.actions = actions;
  }

  /** What support reads back to the stall and the customer before refunding. */
  public Map<String, Object> describe(String slug, long number) {
    VendorEntity v = vendor(slug);
    OrderEntity o = order(v, number);
    Map<String, Object> view = new LinkedHashMap<>();
    view.put("vendor", v.name);
    view.put("orderNumber", o.orderNumber);
    view.put("status", o.status);
    view.put("customer", o.customerName);
    view.put("mobile", o.customerMobile);
    view.put("total", o.total);
    view.put("payment", o.payment == null ? null : o.payment.status);
    view.put("items", o.items.stream().map(i -> i.quantity + "x " + i.name).toList());
    view.put("refundable", refusal(o) == null);
    view.put("why", refusal(o));
    return view;
  }

  public Map<String, Object> refund(String slug, long number, String reason) {
    String why = reason == null ? "" : reason.trim();
    if (why.length() < 5) throw new IllegalArgumentException("Write down why (5+ characters), e.g. \"Stall ran out of momos, confirmed on call\".");
    VendorEntity v = vendor(slug);
    OrderEntity o = order(v, number);
    String refused = refusal(o);
    if (refused != null) throw new IllegalStateException(refused);
    o.status = OrderStatus.CANCELLED;
    o.cancelledBy = "SUPPORT";
    o.cancelledAt = Instant.now(clock);
    payments.refundIfPaid(o);
    orders.save(o);

    SupportActionEntity a = new SupportActionEntity();
    a.action = "REFUND";
    a.orderId = o.id;
    a.vendorSlug = v.slug;
    a.orderNumber = o.orderNumber;
    a.amount = o.total;
    a.reason = why;
    a.at = o.cancelledAt;
    actions.save(a);
    return describe(slug, number);
  }

  private static String refusal(OrderEntity o) {
    if (!REFUNDABLE.contains(o.status)) return "Order is " + o.status + ": only orders not yet handed over can be refunded here.";
    if (o.payment == null || o.payment.status != PaymentInfo.Status.PAID) return "Order isn't paid (payment " + (o.payment == null ? "none" : o.payment.status) + "), so there is nothing to refund.";
    return null;
  }

  private VendorEntity vendor(String slug) {
    return vendors.findBySlug(slug == null ? "" : slug.trim()).orElseThrow(() -> new IllegalArgumentException("No stall with the link " + slug + "."));
  }

  private OrderEntity order(VendorEntity v, long number) {
    return orders.findByVendorIdAndOrderNumber(v.id, number).orElseThrow(() -> new IllegalArgumentException("No order #" + number + " at " + v.name + "."));
  }
}
