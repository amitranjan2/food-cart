package in.foodcart.service;

import in.foodcart.data.CustomerEntity;
import in.foodcart.data.CustomerRepository;
import in.foodcart.data.MenuItemEntity;
import in.foodcart.data.MenuItemRepository;
import in.foodcart.data.OrderEntity;
import in.foodcart.data.OrderRepository;
import in.foodcart.data.VendorEntity;
import in.foodcart.data.VendorRepository;
import in.foodcart.domain.OrderStatus;
import in.foodcart.domain.OrderType;
import in.foodcart.domain.VendorStatus;
import in.foodcart.service.payments.PaymentService;
import in.foodcart.service.slots.SlotRules;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
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
  /** Replaced in tests. */
  Clock clock = Clock.system(SlotRules.ZONE);

  public CheckoutService(VendorRepository v, MenuItemRepository i, OrderRepository o, CustomerRepository c, PaymentService p) {
    vendors = v;
    items = i;
    orders = o;
    customers = c;
    payments = p;
  }

  public record Line(String menuItemId, int quantity, BigDecimal displayedPrice, String portion, String sizeId, List<MenuLinePrice.Pick> options) {}

  /**
   * type is "PICKUP" or "DINE_IN". slot is the chosen start time in India time, e.g. "2026-10-09T14:30".
   * displayedTotal is the amount the customer saw; the order is refused if the server's bill differs.
   */
  public record Request(String vendorId, String type, String slot, BigDecimal displayedTotal, List<Line> items) {}

  public OrderEntity create(String customerId, Request request) {
    VendorEntity v = vendors.findById(request.vendorId()).orElseThrow(() -> new IllegalArgumentException("Vendor not found"));
    if (v.status != VendorStatus.OPEN) throw new IllegalStateException("This vendor is currently closed.");
    OrderEntity o = new OrderEntity();
    o.vendorId = v.id;
    o.customerId = customerId;
    CustomerEntity customer = customers.findById(customerId).orElseThrow(() -> new SecurityException("Customer not found"));
    if (customer.name == null || customer.name.isBlank()) throw new IllegalStateException("Add your name before paying.");
    o.customerMobile = customer.mobile;
    o.customerName = customer.name;
    o.type = OrderType.parse(request.type());
    o.scheduledFor = checkedSlot(v, request.slot()).atZone(SlotRules.ZONE).toInstant();
    for (Line line : request.items()) {
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
      o.items.add(snap);
    }
    if (o.items.isEmpty()) throw new IllegalArgumentException("Cart is empty");
    o.subtotal = o.items.stream().map(x -> x.lineTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
    o.total = o.subtotal;
    // Rounded to paise: the browser adds prices as floating point (0.1 + 0.2 = 0.30000000000000004).
    if (request.displayedTotal() == null || o.total.compareTo(request.displayedTotal().setScale(2, RoundingMode.HALF_UP)) != 0) {
      throw new IllegalStateException("Your cart total has changed. Please review your cart.");
    }
    o.orderNumber = 1000 + orders.count() + 1;
    // Pay first: the vendor only sees the order once the payment is confirmed (PaymentService).
    o.status = OrderStatus.PAYMENT_PENDING;
    o.paymentMethod = "ONLINE";
    return orders.save(o);
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

  public OrderEntity status(String vendorId, String id, OrderStatus target) {
    OrderEntity o = orders.findByIdAndVendorId(id, vendorId).orElseThrow(() -> new SecurityException("Order not found"));
    boolean valid = (o.status == OrderStatus.PLACED && (target == OrderStatus.ACCEPTED || target == OrderStatus.REJECTED))
        || (o.status == OrderStatus.ACCEPTED && target == OrderStatus.PREPARING)
        || (o.status == OrderStatus.PREPARING && (target == OrderStatus.READY || target == OrderStatus.COMPLETED))
        || (o.status == OrderStatus.READY && target == OrderStatus.COMPLETED);
    if (!valid) throw new IllegalStateException("Invalid order status transition");
    o.status = target;
    Instant now = Instant.now();
    if (target == OrderStatus.ACCEPTED) o.acceptedAt = now;
    if (target == OrderStatus.PREPARING) o.preparingAt = now;
    if (target == OrderStatus.READY) o.readyAt = now;
    if (target == OrderStatus.COMPLETED) o.completedAt = now;
    if (target == OrderStatus.REJECTED) {
      o.rejectedAt = now;
      payments.refundIfPaid(o);
    }
    return orders.save(o);
  }
}
