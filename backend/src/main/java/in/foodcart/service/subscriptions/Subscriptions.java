package in.foodcart.service.subscriptions;

import in.foodcart.data.CustomerEntity;
import in.foodcart.data.CustomerRepository;
import in.foodcart.data.MenuItemRepository;
import in.foodcart.data.OrderEntity;
import in.foodcart.data.OrderRepository;
import in.foodcart.data.SubscriptionEntity;
import in.foodcart.data.SubscriptionRepository;
import in.foodcart.data.SubscriptionRunEntity;
import in.foodcart.data.SubscriptionRunRepository;
import in.foodcart.data.VendorEntity;
import in.foodcart.data.VendorRepository;
import in.foodcart.service.CheckoutService;
import in.foodcart.service.MenuLinePrice;
import in.foodcart.service.slots.SlotRules;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeSet;

/**
 * Weekly subscriptions (tracker S2.21). A customer picks dishes, weekdays and a time once; every occurrence then becomes an
 * ordinary pay-at-stall order 12 hours ahead (SubscriptionRules), so the stall sees it like any other and handles it
 * the same way. Safeguards, since nothing is paid in advance at launch: the customer can skip any occurrence until it is
 * placed, an order nobody collects pauses the subscription (CheckoutService), an occurrence that can't be placed (the
 * stall is off, a dish is gone) is skipped with the reason shown, and a customer may hold at most 3 subscriptions.
 * Weekly UPI mandates (one debit a week) arrive with online payment.
 */
@Service
public class Subscriptions {
  public static final int MAX_PER_CUSTOMER = 3;
  public static final int MAX_LINES = 20;
  private static final Logger log = LoggerFactory.getLogger(Subscriptions.class);
  private static final List<SubscriptionEntity.Status> LIVE = List.of(SubscriptionEntity.Status.ACTIVE, SubscriptionEntity.Status.PAUSED);

  private final SubscriptionRepository subscriptions;
  private final SubscriptionRunRepository runs;
  private final VendorRepository vendors;
  private final CustomerRepository customers;
  private final MenuItemRepository items;
  private final OrderRepository orders;
  private final CheckoutService checkout;
  /** Replaced in tests. */
  Clock clock = Clock.system(SlotRules.ZONE);

  public Subscriptions(SubscriptionRepository subscriptions, SubscriptionRunRepository runs, VendorRepository vendors, CustomerRepository customers,
      MenuItemRepository items, OrderRepository orders, CheckoutService checkout) {
    this.subscriptions = subscriptions;
    this.runs = runs;
    this.vendors = vendors;
    this.customers = customers;
    this.items = items;
    this.orders = orders;
    this.checkout = checkout;
  }

  /** What the customer sends: the stall, the days, the time, and the dishes with the "To pay" they saw for one order. */
  public record Create(String vendorId, String type, List<String> days, String time, List<CheckoutService.Line> items, BigDecimal displayedTotal) {}

  public SubscriptionEntity create(String customerId, Create in) {
    VendorEntity v = vendors.findById(in.vendorId() == null ? "" : in.vendorId()).filter(VendorEntity::live).orElseThrow(() -> new IllegalArgumentException("Vendor not found"));
    CustomerEntity customer = customers.findById(customerId).orElseThrow(() -> new SecurityException("Customer not found"));
    if (customer.name == null || customer.name.isBlank()) throw new IllegalStateException("Add your name first.");
    if (customer.noShows >= CheckoutService.NO_SHOW_LIMIT) {
      throw new IllegalStateException("Pay at the stall is off for this number because " + CheckoutService.NO_SHOW_LIMIT + " orders weren't collected. Write to tech@suprmama.in to turn it back on.");
    }
    if (subscriptions.countByCustomerIdAndStatusIn(customerId, LIVE) >= MAX_PER_CUSTOMER) {
      throw new IllegalStateException("You can have " + MAX_PER_CUSTOMER + " weekly orders at a time. Cancel one to add another.");
    }
    String type = in.type() == null ? "" : in.type().toUpperCase();
    if (!type.equals("PICKUP") && !type.equals("DINE_IN")) throw new IllegalArgumentException("Choose Pick Up or Dine In.");
    TreeSet<DayOfWeek> days = new TreeSet<>();
    for (String d : in.days() == null ? List.<String>of() : in.days()) {
      try {
        days.add(DayOfWeek.valueOf(d.trim().toUpperCase()));
      } catch (IllegalArgumentException e) {
        throw new IllegalArgumentException("Unknown day " + d + ".");
      }
    }
    if (days.isEmpty()) throw new IllegalArgumentException("Choose at least one day.");
    String time = in.time() == null ? "" : in.time().trim();
    for (DayOfWeek day : days) {
      if (!SlotRules.offersSlot(v.openingHours, day, time)) {
        throw new IllegalArgumentException(v.name + " doesn't take orders at " + time + " on " + label(day) + ". Pick a time inside its opening hours.");
      }
    }
    if (in.items() == null || in.items().isEmpty() || in.items().size() > MAX_LINES) throw new IllegalArgumentException("Add between 1 and " + MAX_LINES + " dishes.");
    // The customer confirms the price they saw: refuse if the menu has moved since (the same rule as a one-off order).
    BigDecimal total = checkout.quoteAtStall(v.id, in.items().stream().map(l -> new CheckoutService.Line(l.menuItemId(), l.quantity(), l.displayedPrice(), l.portion(), l.sizeId(), l.options())).toList());
    if (in.displayedTotal() == null || total.compareTo(in.displayedTotal().setScale(2, RoundingMode.HALF_UP)) != 0) {
      throw new IllegalStateException("Your cart total has changed. Please review your cart.");
    }

    SubscriptionEntity s = new SubscriptionEntity();
    s.customerId = customerId;
    s.vendorId = v.id;
    s.type = type;
    s.days = new ArrayList<>(days);
    s.time = time;
    s.lines = lines(in.items());
    s.quotedTotal = total;
    s.createdAt = Instant.now(clock);
    s.activeFrom = s.createdAt;
    return subscriptions.save(s);
  }

  public List<Map<String, Object>> list(String customerId) {
    LocalDateTime now = LocalDateTime.now(clock);
    List<Map<String, Object>> out = new ArrayList<>();
    for (SubscriptionEntity s : subscriptions.findByCustomerIdAndStatusInOrderByCreatedAtDesc(customerId, LIVE)) out.add(view(s, now));
    return out;
  }

  public SubscriptionEntity pause(String customerId, String id) {
    SubscriptionEntity s = own(customerId, id);
    if (s.status == SubscriptionEntity.Status.ACTIVE) {
      s.status = SubscriptionEntity.Status.PAUSED;
      s.pauseReason = "CUSTOMER";
      subscriptions.save(s);
    }
    return s;
  }

  /** Starts again; only occurrences at least 12 hours away are placed (the same rule as a new subscription). */
  public SubscriptionEntity resume(String customerId, String id) {
    SubscriptionEntity s = own(customerId, id);
    if (s.status == SubscriptionEntity.Status.PAUSED) {
      CustomerEntity customer = customers.findById(customerId).orElseThrow(() -> new SecurityException("Customer not found"));
      if (customer.noShows >= CheckoutService.NO_SHOW_LIMIT) {
        throw new IllegalStateException("Pay at the stall is off for this number because " + CheckoutService.NO_SHOW_LIMIT + " orders weren't collected. Write to tech@suprmama.in to turn it back on.");
      }
      s.status = SubscriptionEntity.Status.ACTIVE;
      s.pauseReason = null;
      s.activeFrom = Instant.now(clock);
      subscriptions.save(s);
    }
    return s;
  }

  public SubscriptionEntity cancel(String customerId, String id) {
    SubscriptionEntity s = own(customerId, id);
    s.status = SubscriptionEntity.Status.CANCELLED;
    subscriptions.save(s);
    return s;
  }

  public SubscriptionEntity skip(String customerId, String id, LocalDate date) {
    SubscriptionEntity s = own(customerId, id);
    if (!SubscriptionRules.scheduled(s, date)) throw new IllegalArgumentException("That isn't one of this weekly order's days.");
    if (!SubscriptionRules.canSkip(LocalDateTime.now(clock), SubscriptionRules.slotOf(date, s.time))) {
      throw new IllegalStateException("It's too late to skip that one: the order has gone to the stall. Call the stall if you can't come.");
    }
    if (!s.skips.contains(date)) s.skips.add(date);
    return subscriptions.save(s);
  }

  public SubscriptionEntity unskip(String customerId, String id, LocalDate date) {
    SubscriptionEntity s = own(customerId, id);
    if (!SubscriptionRules.canSkip(LocalDateTime.now(clock), SubscriptionRules.slotOf(date, s.time))) {
      throw new IllegalStateException("It's too late to change that one: the order has gone to the stall.");
    }
    s.skips.remove(date);
    return subscriptions.save(s);
  }

  /** Every five minutes: places the orders that are due and records the ones that were missed. */
  @Scheduled(fixedDelay = 300_000, initialDelay = 60_000)
  public void placeDue() {
    runDue(LocalDateTime.now(clock));
  }

  /** Returns how many orders were placed. */
  public int runDue(LocalDateTime now) {
    int placed = 0;
    for (SubscriptionEntity s : subscriptions.findByStatus(SubscriptionEntity.Status.ACTIVE)) {
      try {
        for (LocalDate date : SubscriptionRules.due(s, now)) if (place(s, date)) placed++;
        for (LocalDate date : SubscriptionRules.overdue(s, now)) recordMissed(s, date);
      } catch (RuntimeException e) {
        log.warn("Subscription {} could not be processed: {}", s.id, e.toString());
      }
    }
    if (placed > 0) log.info("Weekly orders placed: {}", placed);
    return placed;
  }

  private boolean place(SubscriptionEntity s, LocalDate date) {
    SubscriptionRunEntity run = claim(s, date);
    if (run == null) return false; // already placed, or another run has it
    try {
      OrderEntity order = checkout.createScheduled(s.customerId, new CheckoutService.Request(s.vendorId, s.type, SubscriptionRules.slotOf(date, s.time).toString(), null,
          s.lines.stream().map(Subscriptions::toLine).toList(), "CASH"), s.id);
      run.outcome = SubscriptionRunEntity.Outcome.ORDERED;
      run.orderId = order.id;
      runs.save(run);
      return true;
    } catch (IllegalStateException | IllegalArgumentException | SecurityException e) {
      // Not an error: the stall is off, a dish is gone, the slot isn't offered. The customer sees why.
      run.outcome = SubscriptionRunEntity.Outcome.SKIPPED;
      run.reason = e.getMessage();
      runs.save(run);
      return false;
    }
  }

  private void recordMissed(SubscriptionEntity s, LocalDate date) {
    SubscriptionRunEntity run = claim(s, date);
    if (run == null) return;
    run.outcome = SubscriptionRunEntity.Outcome.SKIPPED;
    run.reason = "We couldn't place this one in time.";
    runs.save(run);
  }

  /** The first caller for a subscription day gets the run; anyone else gets null (unique index). */
  private SubscriptionRunEntity claim(SubscriptionEntity s, LocalDate date) {
    if (runs.findBySubscriptionIdAndDate(s.id, date).isPresent()) return null;
    SubscriptionRunEntity run = new SubscriptionRunEntity();
    run.subscriptionId = s.id;
    run.date = date;
    run.at = Instant.now(clock);
    try {
      return runs.save(run);
    } catch (DuplicateKeyException e) {
      return null;
    }
  }

  private Map<String, Object> view(SubscriptionEntity s, LocalDateTime now) {
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("id", s.id);
    out.put("status", s.status);
    out.put("pauseReason", s.pauseReason);
    out.put("type", s.type);
    out.put("days", s.days);
    out.put("time", s.time);
    out.put("quotedTotal", s.quotedTotal);
    Map<String, Object> vendor = new LinkedHashMap<>();
    vendors.findById(s.vendorId).ifPresent(v -> {
      vendor.put("name", v.name);
      vendor.put("slug", v.slug);
    });
    out.put("vendor", vendor);
    out.put("lines", s.lines.stream().map(l -> {
      Map<String, Object> line = new LinkedHashMap<>();
      line.put("name", items.findById(l.menuItemId).map(m -> m.name).orElse("A dish that was removed"));
      line.put("quantity", l.quantity);
      return line;
    }).toList());
    List<Map<String, Object>> next = new ArrayList<>();
    for (SubscriptionRules.Occurrence o : SubscriptionRules.upcoming(s, now, 4)) {
      Map<String, Object> row = new LinkedHashMap<>();
      row.put("date", o.date().toString());
      row.put("slot", o.slot().toString());
      Optional<SubscriptionRunEntity> run = runs.findBySubscriptionIdAndDate(s.id, o.date());
      String state = "UPCOMING";
      if (s.skips.contains(o.date())) state = "SKIPPED";
      if (run.isPresent()) {
        SubscriptionRunEntity r = run.get();
        if (r.outcome == SubscriptionRunEntity.Outcome.ORDERED) {
          state = "ORDERED";
          row.put("orderId", r.orderId);
          orders.findById(r.orderId).ifPresent(order -> row.put("orderStatus", order.status));
        } else if (r.outcome == SubscriptionRunEntity.Outcome.SKIPPED) {
          state = "SKIPPED";
          row.put("reason", r.reason);
        }
      }
      row.put("state", state);
      boolean beforePlacing = SubscriptionRules.canSkip(now, o.slot());
      row.put("canSkip", state.equals("UPCOMING") && beforePlacing);
      row.put("canUndoSkip", state.equals("SKIPPED") && s.skips.contains(o.date()) && beforePlacing);
      next.add(row);
    }
    // A paused weekly order places nothing, so there is nothing to show until it is resumed.
    out.put("next", s.status == SubscriptionEntity.Status.ACTIVE ? next : List.of());
    return out;
  }

  private SubscriptionEntity own(String customerId, String id) {
    SubscriptionEntity s = subscriptions.findByIdAndCustomerId(id, customerId).orElseThrow(() -> new IllegalArgumentException("Weekly order not found"));
    if (s.status == SubscriptionEntity.Status.CANCELLED) throw new IllegalStateException("This weekly order was cancelled.");
    return s;
  }

  private static List<SubscriptionEntity.Line> lines(List<CheckoutService.Line> in) {
    List<SubscriptionEntity.Line> out = new ArrayList<>();
    for (CheckoutService.Line l : in) {
      SubscriptionEntity.Line line = new SubscriptionEntity.Line();
      line.menuItemId = l.menuItemId();
      line.quantity = l.quantity();
      line.portion = l.portion();
      line.sizeId = l.sizeId();
      if (l.options() != null) for (MenuLinePrice.Pick p : l.options()) line.options.add(new SubscriptionEntity.Option(p.variantId(), p.optionIds() == null ? new ArrayList<>() : new ArrayList<>(p.optionIds())));
      out.add(line);
    }
    return out;
  }

  private static CheckoutService.Line toLine(SubscriptionEntity.Line l) {
    return new CheckoutService.Line(l.menuItemId, l.quantity, null, l.portion, l.sizeId, l.options.stream().map(o -> new MenuLinePrice.Pick(o.variantId, o.optionIds)).toList());
  }

  private static String label(DayOfWeek day) {
    String name = day.name();
    return name.charAt(0) + name.substring(1).toLowerCase();
  }
}
