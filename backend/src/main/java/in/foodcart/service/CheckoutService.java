package in.foodcart.service;

import in.foodcart.data.CustomerEntity;
import in.foodcart.data.CustomerRepository;
import in.foodcart.data.MenuItemEntity;
import in.foodcart.data.MenuItemRepository;
import in.foodcart.data.OrderEntity;
import in.foodcart.data.OrderRepository;
import in.foodcart.data.SubscriptionEntity;
import in.foodcart.data.SubscriptionRepository;
import in.foodcart.data.VendorEntity;
import in.foodcart.data.VendorRepository;
import in.foodcart.domain.OrderStatus;
import in.foodcart.domain.OrderType;
import in.foodcart.domain.PaymentMethod;
import in.foodcart.domain.VendorStatus;
import in.foodcart.service.handover.HandoverRules;
import in.foodcart.service.payments.PaymentService;
import in.foodcart.service.pricing.BillRules;
import in.foodcart.service.pricing.InvoiceNumbers;
import in.foodcart.service.pricing.Pricing;
import in.foodcart.service.slots.SlotRules;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;

@Service
public class CheckoutService {
  private final VendorRepository vendors;
  private final MenuItemRepository items;
  private final OrderRepository orders;
  private final CustomerRepository customers;
  private final PaymentService payments;
  private final Pricing pricing;
  private final InvoiceNumbers invoices;
  private final OrderNumbers numbers;
  private final CustomerHistory history;
  private final SubscriptionRepository subscriptions;
  /** A customer's pay-at-stall orders not yet collected; more must wait. */
  public static final int OPEN_CASH_LIMIT = 2;
  /** Pay-at-stall orders a number may fail to collect before pay-at-stall is off for it. */
  public static final int NO_SHOW_LIMIT = 2;
  /** How long after the slot starts the stall may mark a pay-at-stall order as not collected. */
  public static final Duration NO_SHOW_AFTER = Duration.ofMinutes(30);
  /** Pay-at-stall orders older than this (by slot) no longer count as open, so a stall that never answered can't block a customer. */
  static final Duration OPEN_FOR = Duration.ofHours(3);
  private static final List<OrderStatus> OPEN = List.of(OrderStatus.PLACED, OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY);
  /** Replaced in tests. */
  Clock clock = Clock.system(SlotRules.ZONE);

  public CheckoutService(VendorRepository v, MenuItemRepository i, OrderRepository o, CustomerRepository c, PaymentService p, Pricing pricing, InvoiceNumbers invoices,
      OrderNumbers numbers, CustomerHistory history, SubscriptionRepository subscriptions) {
    this.subscriptions = subscriptions;
    this.numbers = numbers;
    this.history = history;
    vendors = v;
    items = i;
    orders = o;
    customers = c;
    payments = p;
    this.pricing = pricing;
    this.invoices = invoices;
  }

  public record Line(String menuItemId, int quantity, BigDecimal displayedPrice, String portion, String sizeId, List<MenuLinePrice.Pick> options) {}

  /**
   * type is "PICKUP" or "DINE_IN". slot is the chosen start time in India time, e.g. "2026-10-09T14:30".
   * displayedTotal is the "To pay" amount the customer saw (BillRules: items + GST + platform charges + their GST); the
   * order is refused if the server's bill differs. paymentMethod is "ONLINE" (the default) or "CASH" (pay at the stall).
   */
  public record Request(String vendorId, String type, String slot, BigDecimal displayedTotal, List<Line> items, String paymentMethod) {}

  public OrderEntity create(String customerId, Request request) {
    return place(customerId, request, null);
  }

  /**
   * An occurrence of a weekly subscription (tracker S2.21): priced now from the menu (there is no cart the customer
   * saw), always paid at the stall, and not held back by the limit on waiting orders, which they chose on purpose.
   */
  public OrderEntity createScheduled(String customerId, Request request, String subscriptionId) {
    return place(customerId, request, subscriptionId);
  }

  /** What one order of these lines costs at the stall right now (items + GST); refuses lines that can't be ordered. */
  public BigDecimal quoteAtStall(String vendorId, List<Line> lines) {
    VendorEntity v = vendors.findById(vendorId).orElseThrow(() -> new IllegalArgumentException("Vendor not found"));
    if (!v.live()) throw new IllegalArgumentException("Vendor not found");
    BigDecimal subtotal = priced(v, lines).stream().map(x -> x.lineTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
    return pricing.bill(subtotal, PaymentMethod.CASH).total();
  }

  private List<OrderEntity.Item> priced(VendorEntity v, List<Line> lines) {
    List<OrderEntity.Item> result = new java.util.ArrayList<>();
    for (Line line : lines) {
      MenuItemEntity m = items.findByIdAndVendorId(line.menuItemId(), v.id).orElseThrow(() -> new IllegalStateException("An item no longer exists."));
      MenuLinePrice.Quote quote = MenuLinePrice.quote(m, line.portion(), line.sizeId(), line.options());
      boolean half = "HALF".equals(quote.portion());
      if (!m.active || !m.available || (half && (!m.halfAvailable || quote.price() == null))) {
        throw new IllegalStateException(m.name + " is no longer available.");
      }
      if (line.displayedPrice() != null && quote.price().compareTo(line.displayedPrice()) != 0) {
        throw new IllegalStateException("Price of " + m.name + " has changed. Please review your cart.");
      }
      if (line.quantity() < 1) throw new IllegalArgumentException("Quantity must be at least 1");
      OrderEntity.Item snap = new OrderEntity.Item();
      snap.menuItemId = m.id;
      snap.name = m.name;
      snap.portion = quote.portion();
      snap.summary = quote.summary();
      snap.price = quote.price();
      snap.quantity = line.quantity();
      snap.lineTotal = quote.price().multiply(BigDecimal.valueOf(line.quantity()));
      result.add(snap);
    }
    if (result.isEmpty()) throw new IllegalArgumentException("Cart is empty");
    return result;
  }

  private OrderEntity place(String customerId, Request request, String subscriptionId) {
    VendorEntity v = vendors.findById(request.vendorId()).orElseThrow(() -> new IllegalArgumentException("Vendor not found"));
    if (!v.live()) throw new IllegalArgumentException("Vendor not found");
    if (v.status != VendorStatus.OPEN) throw new IllegalStateException(subscriptionId == null ? "This vendor is currently closed." : v.name + " is switched off.");
    OrderEntity o = new OrderEntity();
    o.vendorId = v.id;
    o.customerId = customerId;
    o.subscriptionId = subscriptionId;
    CustomerEntity customer = customers.findById(customerId).orElseThrow(() -> new SecurityException("Customer not found"));
    if (customer.name == null || customer.name.isBlank()) throw new IllegalStateException("Add your name before paying.");
    PaymentMethod method = subscriptionId == null ? PaymentMethod.parse(request.paymentMethod()) : PaymentMethod.CASH;
    if (method == PaymentMethod.ONLINE && !payments.onlineAvailable()) throw new IllegalStateException("Online payment isn't available yet. Choose pay at the stall.");
    if (method == PaymentMethod.CASH) checkCashAllowed(customer, subscriptionId == null);
    o.customerMobile = customer.mobile;
    o.customerName = customer.name;
    o.type = OrderType.parse(request.type());
    o.scheduledFor = checkedSlot(v, request.slot()).atZone(SlotRules.ZONE).toInstant();
    o.items.addAll(priced(v, request.items()));
    o.subtotal = o.items.stream().map(x -> x.lineTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
    BillRules.Bill bill = pricing.bill(o.subtotal, method);
    o.bill = snapshot(bill);
    o.total = bill.total();
    // Rounded to paise: the browser adds prices as floating point (0.1 + 0.2 = 0.30000000000000004).
    if (subscriptionId == null && (request.displayedTotal() == null || o.total.compareTo(request.displayedTotal().setScale(2, RoundingMode.HALF_UP)) != 0)) {
      throw new IllegalStateException("Your cart total has changed. Please review your cart.");
    }
    o.paymentMethod = method.name();
    if (method == PaymentMethod.CASH) {
      // Paid at the stall on collection, so the stall sees it now; the guards above stand in for the payment.
      o.status = OrderStatus.PLACED;
      o.orderNumber = numbers.next(v.id);
      OrderEntity saved = orders.save(o);
      history.recordOrder(customerId, v.id, Instant.now(clock));
      return saved;
    }
    // The order number is given when the payment is confirmed (PaymentService / OrderNumbers), not now.
    // Pay first: the vendor only sees the order once the payment is confirmed (PaymentService).
    o.status = OrderStatus.PAYMENT_PENDING;
    return orders.save(o);
  }

  /** Pay-at-stall needs no payment up front, so: not after repeated no-shows, and only a few uncollected at once. */
  private void checkCashAllowed(CustomerEntity customer, boolean limitWaitingOrders) {
    if (!payments.cashAvailable()) throw new IllegalStateException("Pay at the stall isn't available. Please pay online.");
    if (customer.noShows >= NO_SHOW_LIMIT) {
      throw new IllegalStateException("Pay at the stall is off for this number because " + NO_SHOW_LIMIT
          + " orders weren't collected. Write to tech@suprmama.in to turn it back on.");
    }
    if (!limitWaitingOrders) return;
    Instant since = Instant.now(clock).minus(OPEN_FOR);
    if (orders.countByCustomerIdAndPaymentMethodAndStatusInAndScheduledForAfter(customer.id, PaymentMethod.CASH.name(), OPEN, since) >= OPEN_CASH_LIMIT) {
      throw new IllegalStateException("You already have " + OPEN_CASH_LIMIT + " pay-at-stall orders waiting. Collect them before ordering again.");
    }
  }

  /** The slot must still be one the vendor offers right now; slots in the past or outside opening hours are refused. */
  private LocalDateTime checkedSlot(VendorEntity v, String slot) {
    List<LocalDateTime> open = SlotRules.slots(v.openingHours, LocalDateTime.now(clock));
    if (open.isEmpty()) throw new IllegalStateException("This vendor isn't taking orders for any time slot right now.");
    if (slot == null || slot.isBlank()) throw new IllegalArgumentException("Pick a time slot.");
    try {
      LocalDateTime chosen = LocalDateTime.parse(slot);
      if (open.contains(chosen)) return chosen;
    } catch (DateTimeParseException ignored) {
      // fall through to the message below
    }
    throw new IllegalStateException("That time slot is no longer available. Please pick another.");
  }

  /**
   * The vendor enters the code the customer shows; only a matching code completes the order. Delivery partners will
   * use the same HandoverRules with their own party.
   */
  public OrderEntity handOver(String vendorId, String id, String code) {
    OrderEntity o = orders.findByIdAndVendorId(id, vendorId).orElseThrow(() -> new SecurityException("Order not found"));
    if (o.status != OrderStatus.READY) throw new IllegalStateException("Mark the order ready before handing it over.");
    if (o.handover == null) throw new IllegalStateException("This order has no handover code.");
    boolean ok = HandoverRules.verify(o.handover, code, new HandoverRules.Party("VENDOR", vendorId), Instant.now(clock));
    if (!ok) {
      orders.save(o);
      int left = HandoverRules.MAX_ATTEMPTS - o.handover.attempts;
      throw new IllegalArgumentException(left > 0
          ? "Wrong code. " + left + (left == 1 ? " try" : " tries") + " left."
          : "Too many wrong codes. Try again in a few minutes, or ask the customer to refresh their order page.");
    }
    o.status = OrderStatus.COMPLETED;
    o.completedAt = Instant.now(clock);
    // The stall is told to take the money before entering the code, so the code stands for "paid".
    if (o.cash()) o.cashCollectedAt = o.completedAt;
    // The food has been supplied: now the tax invoices exist. Orders that never get here (rejected, refunded) have none.
    invoices.issue(o, o.completedAt);
    return orders.save(o);
  }

  public OrderEntity status(String vendorId, String id, OrderStatus target) {
    OrderEntity o = orders.findByIdAndVendorId(id, vendorId).orElseThrow(() -> new SecurityException("Order not found"));
    if (target == OrderStatus.NO_SHOW) return noShow(o);
    // Completing always goes through handOver: the order must be READY and the customer's code must match.
    if (target == OrderStatus.COMPLETED) throw new IllegalStateException("Enter the customer's handover code to complete this order.");
    boolean valid = (o.status == OrderStatus.PLACED && (target == OrderStatus.ACCEPTED || target == OrderStatus.REJECTED))
        || (o.status == OrderStatus.ACCEPTED && target == OrderStatus.PREPARING)
        || (o.status == OrderStatus.PREPARING && target == OrderStatus.READY);
    if (!valid) throw new IllegalStateException("Invalid order status transition");
    o.status = target;
    Instant now = Instant.now();
    if (target == OrderStatus.ACCEPTED) o.acceptedAt = now;
    if (target == OrderStatus.PREPARING) o.preparingAt = now;
    if (target == OrderStatus.READY) {
      o.readyAt = now;
      // The code exists only once the food is ready, so it can't be shared (or used) earlier.
      if (o.handover == null) o.handover = HandoverRules.issue();
    }
    if (target == OrderStatus.REJECTED) {
      o.rejectedAt = now;
      payments.refundIfPaid(o);
    }
    return orders.save(o);
  }

  /** The customer didn't come for a pay-at-stall order: no invoice, no charge day, and it counts against their number. */
  private OrderEntity noShow(OrderEntity o) {
    if (!o.cash()) throw new IllegalStateException("Only pay-at-stall orders can be marked as not collected.");
    if (o.status != OrderStatus.ACCEPTED && o.status != OrderStatus.PREPARING && o.status != OrderStatus.READY) {
      throw new IllegalStateException("Only accepted orders can be marked as not collected.");
    }
    Instant now = Instant.now(clock);
    Instant from = o.scheduledFor.plus(NO_SHOW_AFTER);
    if (now.isBefore(from)) {
      long minutes = Duration.between(now, from).toMinutes() + 1;
      throw new IllegalStateException("Wait " + minutes + " more " + (minutes == 1 ? "minute" : "minutes") + ": you can mark it as not collected "
          + NO_SHOW_AFTER.toMinutes() + " minutes after the pickup time.");
    }
    o.status = OrderStatus.NO_SHOW;
    o.noShowAt = now;
    // A weekly order nobody collected pauses the subscription: the stall shouldn't cook for a customer who stopped coming.
    if (o.subscriptionId != null) {
      subscriptions.findById(o.subscriptionId).ifPresent(sub -> {
        if (sub.status == SubscriptionEntity.Status.ACTIVE) {
          sub.status = SubscriptionEntity.Status.PAUSED;
          sub.pauseReason = "MISSED";
          subscriptions.save(sub);
        }
      });
    }
    customers.findById(o.customerId).ifPresent(c -> {
      c.noShows++;
      c.updatedAt = now;
      customers.save(c);
    });
    return orders.save(o);
  }

  private static OrderEntity.Bill snapshot(BillRules.Bill b) {
    OrderEntity.Bill s = new OrderEntity.Bill();
    s.itemTotal = b.itemTotal();
    s.foodGst = b.foodGst();
    s.platformFee = b.platformFee();
    s.platformFeeGst = b.platformFeeGst();
    s.total = b.total();
    s.foodGstPercent = BigDecimal.valueOf(b.rates().foodGstBp(), 2).stripTrailingZeros();
    s.platformFeePercent = BigDecimal.valueOf(b.rates().platformFeeBp(), 2).stripTrailingZeros();
    s.platformFeeGstPercent = BigDecimal.valueOf(b.rates().platformFeeGstBp(), 2).stripTrailingZeros();
    return s;
  }
}
