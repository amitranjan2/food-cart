package in.foodcart.service.billing;

import in.foodcart.data.*;
import in.foodcart.domain.OrderStatus;
import in.foodcart.domain.PaymentMethod;
import in.foodcart.service.pricing.InvoiceNumbers;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;

/**
 * Monthly statements of the GST on food that stalls took in cash (tracker S2.19, decided Oct 11): after each month,
 * one statement per stall listing its collected pay-at-stall orders, due in 7 days, paid by UPI like the plan invoices.
 * Runs whether or not plan billing has started: the GST is owed from the first order.
 */
@Service
public class VendorCollections {
  private static final Logger log = LoggerFactory.getLogger(VendorCollections.class);
  static final ZoneId INDIA = ZoneId.of("Asia/Kolkata");

  private final VendorRepository vendors;
  private final OrderRepository orders;
  private final VendorCollectionRepository statements;
  private final InvoiceNumbers numbers;
  /** Replaced in tests. */
  Clock clock = Clock.system(INDIA);

  public VendorCollections(VendorRepository vendors, OrderRepository orders, VendorCollectionRepository statements, InvoiceNumbers numbers) {
    this.vendors = vendors;
    this.orders = orders;
    this.statements = statements;
    this.numbers = numbers;
  }

  /** Just after the plan billing run (00:30). */
  @Scheduled(cron = "0 35 0 * * *", zone = "Asia/Kolkata")
  public void nightly() {
    run(LocalDate.now(clock));
  }

  /** Issues a statement for every finished month with uncollected GST. Safe to repeat. Returns how many were issued. */
  public int run(LocalDate today) {
    int issued = 0;
    for (VendorEntity v : vendors.findAll()) issued += runFor(v, today);
    if (issued > 0) log.info("Collection run {}: {} statement(s) issued", today, issued);
    return issued;
  }

  int runFor(VendorEntity v, LocalDate today) {
    YearMonth current = YearMonth.from(today);
    Map<YearMonth, List<OrderEntity>> byMonth = new TreeMap<>();
    for (OrderEntity o : orders.findByVendorIdAndPaymentMethodAndStatus(v.id, PaymentMethod.CASH.name(), OrderStatus.COMPLETED)) {
      if (!owes(o)) continue;
      YearMonth m = YearMonth.from(LocalDate.ofInstant(o.cashCollectedAt, INDIA));
      if (m.isBefore(current)) byMonth.computeIfAbsent(m, k -> new ArrayList<>()).add(o);
    }
    int issued = 0;
    for (Map.Entry<YearMonth, List<OrderEntity>> e : byMonth.entrySet()) {
      if (statements.existsByVendorIdAndPeriodStart(v.id, e.getKey().atDay(1))) continue;
      issued += issue(v, e.getKey(), e.getValue(), today);
    }
    return issued;
  }

  /** A collected pay-at-stall order whose GST isn't on a statement yet. */
  static boolean owes(OrderEntity o) {
    return o.cash() && o.cashCollectedAt != null && o.collectionNumber == null && o.bill != null && o.bill.foodGst != null && o.bill.foodGst.signum() > 0;
  }

  private int issue(VendorEntity v, YearMonth month, List<OrderEntity> owed, LocalDate today) {
    owed.sort(Comparator.comparing(o -> o.cashCollectedAt));
    Instant now = today.atTime(LocalTime.now(clock)).atZone(INDIA).toInstant();
    VendorCollectionEntity s = new VendorCollectionEntity();
    s.vendorId = v.id;
    s.periodStart = month.atDay(1);
    s.periodEnd = month.atEndOfMonth();
    BigDecimal items = BigDecimal.ZERO, gst = BigDecimal.ZERO;
    for (OrderEntity o : owed) {
      VendorCollectionEntity.Line l = new VendorCollectionEntity.Line();
      l.orderNumber = o.orderNumber;
      l.collectedOn = LocalDate.ofInstant(o.cashCollectedAt, INDIA);
      l.invoiceNumber = o.invoice == null ? null : o.invoice.foodNumber;
      l.itemTotal = o.bill.itemTotal;
      l.foodGst = o.bill.foodGst;
      s.orders.add(l);
      items = items.add(o.bill.itemTotal);
      gst = gst.add(o.bill.foodGst);
    }
    s.itemTotal = items;
    s.total = gst;
    s.issuedAt = now;
    s.dueOn = today.plusDays(7);
    s.number = numbers.next("SMC", now);
    try {
      statements.save(s);
    } catch (DuplicateKeyException e) {
      return 0; // another run got there first
    }
    for (OrderEntity o : owed) {
      o.collectionNumber = s.number;
      orders.save(o);
    }
    return 1;
  }

  /** Unpaid statements, oldest due first (ops/billing.sh due). */
  public List<Map<String, Object>> due() {
    return statements.findByStatusOrderByDueOnAsc(VendorCollectionEntity.Status.DUE).stream().map(s -> {
      Map<String, Object> row = new LinkedHashMap<>();
      VendorEntity v = vendors.findById(s.vendorId).orElse(null);
      row.put("number", s.number);
      row.put("stall", v == null ? s.vendorId : v.name + " (" + v.slug + ")");
      row.put("mobile", v == null ? null : v.mobile);
      row.put("plan", "GST on cash orders");
      row.put("period", s.periodStart + " – " + s.periodEnd);
      row.put("total", s.total);
      row.put("dueOn", s.dueOn);
      return row;
    }).toList();
  }

  public VendorCollectionEntity markPaid(String number, String ref) {
    VendorCollectionEntity s = statements.findByNumber(number == null ? "" : number.trim()).orElseThrow(() -> new IllegalArgumentException("No statement " + number + "."));
    if (s.status == VendorCollectionEntity.Status.PAID) throw new IllegalStateException(s.number + " is already paid.");
    if (ref == null || ref.trim().length() < 4) throw new IllegalArgumentException("Give the UPI or bank reference (4+ characters).");
    s.status = VendorCollectionEntity.Status.PAID;
    s.paidAt = Instant.now(clock);
    s.paymentRef = ref.trim();
    return statements.save(s);
  }

  /** GST on this month's collected pay-at-stall orders so far, for the vendor's billing screen. */
  public BigDecimal thisMonthSoFar(String vendorId) {
    YearMonth current = YearMonth.now(clock);
    return orders.findByVendorIdAndPaymentMethodAndStatus(vendorId, PaymentMethod.CASH.name(), OrderStatus.COMPLETED).stream()
        .filter(VendorCollections::owes)
        .filter(o -> YearMonth.from(LocalDate.ofInstant(o.cashCollectedAt, INDIA)).equals(current))
        .map(o -> o.bill.foodGst).reduce(BigDecimal.ZERO, BigDecimal::add);
  }
}
