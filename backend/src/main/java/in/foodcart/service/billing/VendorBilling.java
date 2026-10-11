package in.foodcart.service.billing;

import in.foodcart.data.*;
import in.foodcart.domain.VendorPlan;
import in.foodcart.service.pricing.BillRules;
import in.foodcart.service.pricing.InvoiceNumbers;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.util.*;

/**
 * Bills stalls for Supr-Mama (tracker S4.24): DAILY ₹100 per charged day (ChargeDays), invoiced after the month;
 * MONTHLY ₹2,500 at the start of each month; YEARLY ₹25,000 at the start of each 12-month term. GST at 18% on top.
 * Plans by calendar month (PlanRules). Until payouts exist, vendors pay by UPI and the team marks invoices paid.
 * Billing is off until app.billing.start is set; nothing before that day is charged.
 */
@Service
public class VendorBilling {
  private static final Logger log = LoggerFactory.getLogger(VendorBilling.class);
  static final ZoneId INDIA = ZoneId.of("Asia/Kolkata");

  public record Prices(BigDecimal daily, BigDecimal monthly, BigDecimal yearly, BigDecimal gstPercent) {
    BigDecimal of(VendorPlan plan) {
      return switch (plan) { case DAILY -> daily; case MONTHLY -> monthly; case YEARLY -> yearly; };
    }
  }

  private final VendorRepository vendors;
  private final OrderRepository orders;
  private final VendorInvoiceRepository invoices;
  private final VendorBusinessRepository business;
  private final InvoiceNumbers numbers;
  private final Prices prices;
  private final LocalDate start;
  private final Set<String> testMobiles;
  private final String payToUpi;
  /** Replaced in tests. */
  Clock clock = Clock.system(INDIA);

  public VendorBilling(VendorRepository vendors, OrderRepository orders, VendorInvoiceRepository invoices, VendorBusinessRepository business, InvoiceNumbers numbers,
      @Value("${app.billing.daily:100}") BigDecimal daily, @Value("${app.billing.monthly:2500}") BigDecimal monthly, @Value("${app.billing.yearly:25000}") BigDecimal yearly,
      @Value("${app.billing.gst-percent:18}") BigDecimal gstPercent, @Value("${app.billing.start:}") String start,
      @Value("${app.billing.test-mobiles:}") String testMobiles, @Value("${app.billing.pay-to-upi:}") String payToUpi) {
    this.vendors = vendors;
    this.orders = orders;
    this.invoices = invoices;
    this.business = business;
    this.numbers = numbers;
    this.prices = new Prices(daily, monthly, yearly, gstPercent);
    this.start = start.isBlank() ? null : LocalDate.parse(start.trim());
    this.testMobiles = new HashSet<>(Arrays.stream(testMobiles.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList());
    this.payToUpi = payToUpi.isBlank() ? null : payToUpi.trim();
  }

  static List<PlanRules.Step> steps(VendorEntity v) {
    return v.planSteps == null ? List.of() : v.planSteps.stream().map(s -> new PlanRules.Step(s.plan, YearMonth.parse(s.from))).toList();
  }

  /** The first day a stall can be charged for: billing start, and only once the stall is live. */
  LocalDate chargeableFrom(VendorEntity v) {
    Instant live = v.reviewedAt != null ? v.reviewedAt : v.createdAt != null ? v.createdAt : Instant.EPOCH;
    LocalDate liveDay = LocalDate.ofInstant(live, INDIA);
    return start == null || liveDay.isAfter(start) ? liveDay : start;
  }

  /** Every day at 00:30 India time; safe to repeat (one invoice per period, unique index). */
  @Scheduled(cron = "0 30 0 * * *", zone = "Asia/Kolkata")
  public void nightly() {
    run(LocalDate.now(clock));
  }

  /** Issues every invoice due by `today`. Returns how many were issued. */
  public int run(LocalDate today) {
    if (start == null) return 0;
    int issued = 0;
    for (VendorEntity v : vendors.findAll()) {
      if (!v.live()) continue;
      issued += runFor(v, today);
    }
    if (issued > 0) log.info("Billing run {}: {} invoice(s) issued", today, issued);
    return issued;
  }

  int runFor(VendorEntity v, LocalDate today) {
    LocalDate from = chargeableFrom(v);
    if (from.isAfter(today)) return 0;
    List<PlanRules.Step> steps = steps(v);
    YearMonth current = YearMonth.from(today);
    List<OrderEntity> sold = null;
    int issued = 0;
    for (YearMonth m = YearMonth.from(from); !m.isAfter(current); m = m.plusMonths(1)) {
      VendorPlan plan = PlanRules.planFor(steps, m);
      if (plan == VendorPlan.DAILY && m.isBefore(current) && !invoices.existsByVendorIdAndPlanAndPeriodStart(v.id, plan, m.atDay(1))) {
        if (sold == null) sold = orders.findByVendorIdOrderByCreatedAtDesc(v.id);
        TreeSet<LocalDate> days = ChargeDays.in(sold, m, testMobiles, from);
        if (!days.isEmpty()) issued += issue(v, plan, m.atDay(1), m.atEndOfMonth(), new ArrayList<>(days), days.size(), today);
      } else if (plan == VendorPlan.MONTHLY && !invoices.existsByVendorIdAndPlanAndPeriodStart(v.id, plan, m.atDay(1))) {
        issued += issue(v, plan, m.atDay(1), m.atEndOfMonth(), null, 1, today);
      } else if (plan == VendorPlan.YEARLY) {
        YearMonth term = PlanRules.yearlyStart(steps, m);
        if (!invoices.existsByVendorIdAndPlanAndPeriodStart(v.id, plan, term.atDay(1))) {
          issued += issue(v, plan, term.atDay(1), term.plusMonths(11).atEndOfMonth(), null, 1, today);
        }
      }
    }
    return issued;
  }

  /** Dated on the run day (the nightly run's today; an admin run for another day dates its invoices that day). */
  private int issue(VendorEntity v, VendorPlan plan, LocalDate periodStart, LocalDate periodEnd, List<LocalDate> days, int units, LocalDate today) {
    Instant now = today.atTime(LocalTime.now(clock)).atZone(INDIA).toInstant();
    VendorInvoiceEntity inv = new VendorInvoiceEntity();
    inv.vendorId = v.id;
    inv.plan = plan;
    inv.periodStart = periodStart;
    inv.periodEnd = periodEnd;
    inv.chargeDays = days;
    inv.units = units;
    inv.unitPrice = prices.of(plan).setScale(2, RoundingMode.HALF_UP);
    inv.taxable = inv.unitPrice.multiply(BigDecimal.valueOf(units));
    inv.gstPercent = prices.gstPercent();
    BigDecimal gst = inv.taxable.multiply(prices.gstPercent()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    BigDecimal[] split = BillRules.split(gst);
    inv.cgst = split[0];
    inv.sgst = split[1];
    inv.total = inv.taxable.add(gst);
    inv.vendorGstin = business.findById(v.id).map(b -> b.gstin).orElse(null);
    inv.issuedAt = now;
    inv.dueOn = today.plusDays(7);
    inv.number = numbers.next("SMV", now);
    try {
      invoices.save(inv);
      return 1;
    } catch (DuplicateKeyException alreadyIssued) {
      return 0;
    }
  }

  /** What the vendor app's billing screen shows. */
  public Map<String, Object> status(String vendorId) {
    VendorEntity v = vendors.findById(vendorId).orElseThrow();
    LocalDate today = LocalDate.now(clock);
    YearMonth month = YearMonth.from(today);
    List<PlanRules.Step> steps = steps(v);
    VendorPlan plan = PlanRules.planFor(steps, month);
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("billingOn", start != null);
    out.put("plan", plan);
    out.put("plans", List.of(
        Map.of("plan", VendorPlan.DAILY, "price", prices.daily(), "per", "day you sell"),
        Map.of("plan", VendorPlan.MONTHLY, "price", prices.monthly(), "per", "month"),
        Map.of("plan", VendorPlan.YEARLY, "price", prices.yearly(), "per", "year")));
    out.put("gstPercent", prices.gstPercent());
    out.put("next", steps.stream().filter(s -> s.from().isAfter(month)).reduce((a, b) -> b).map(s -> Map.of("plan", s.plan(), "from", s.from().atDay(1))).orElse(null));
    out.put("earliestSwitch", PlanRules.earliestSwitch(steps, today).atDay(1));
    YearMonth yearly = PlanRules.yearlyStart(steps, month);
    out.put("yearlyUntil", yearly == null ? null : yearly.plusMonths(11).atEndOfMonth());
    if (plan == VendorPlan.DAILY && start != null) {
      TreeSet<LocalDate> days = ChargeDays.in(orders.findByVendorIdOrderByCreatedAtDesc(v.id), month, testMobiles, chargeableFrom(v));
      out.put("daysThisMonth", days.size());
      out.put("thisMonthSoFar", prices.daily().multiply(BigDecimal.valueOf(days.size())));
    }
    List<VendorInvoiceEntity> list = invoices.findByVendorIdOrderByPeriodStartDesc(v.id);
    out.put("invoices", list);
    out.put("due", list.stream().filter(i -> i.status == VendorInvoiceEntity.Status.DUE).map(i -> i.total).reduce(BigDecimal.ZERO, BigDecimal::add));
    out.put("payToUpi", payToUpi);
    return out;
  }

  /** The vendor picks a plan; it starts on the 1st of next month (or after a running yearly term). */
  public Map<String, Object> choose(String vendorId, VendorPlan plan) {
    if (plan == null) throw new IllegalArgumentException("Pick Daily, Monthly or Yearly.");
    VendorEntity v = vendors.findById(vendorId).orElseThrow();
    List<PlanRules.Step> next = PlanRules.choose(steps(v), plan, LocalDate.now(clock));
    v.planSteps = new ArrayList<>(next.stream().map(s -> new VendorEntity.PlanStep(s.plan(), s.from().toString())).toList());
    v.updatedAt = Instant.now(clock);
    vendors.save(v);
    return status(vendorId);
  }

  /** Unpaid invoices, oldest due first (ops/billing.sh due). */
  public List<Map<String, Object>> due() {
    return invoices.findByStatusOrderByDueOnAsc(VendorInvoiceEntity.Status.DUE).stream().map(i -> {
      Map<String, Object> row = new LinkedHashMap<>();
      VendorEntity v = vendors.findById(i.vendorId).orElse(null);
      row.put("number", i.number);
      row.put("stall", v == null ? i.vendorId : v.name + " (" + v.slug + ")");
      row.put("mobile", v == null ? null : v.mobile);
      row.put("plan", i.plan);
      row.put("period", i.periodStart + " – " + i.periodEnd);
      row.put("total", i.total);
      row.put("dueOn", i.dueOn);
      return row;
    }).toList();
  }

  public VendorInvoiceEntity markPaid(String number, String ref) {
    VendorInvoiceEntity inv = invoices.findByNumber(number == null ? "" : number.trim()).orElseThrow(() -> new IllegalArgumentException("No invoice " + number + "."));
    if (inv.status == VendorInvoiceEntity.Status.PAID) throw new IllegalStateException(inv.number + " is already paid.");
    if (ref == null || ref.trim().length() < 4) throw new IllegalArgumentException("Give the UPI or bank reference (4+ characters).");
    inv.status = VendorInvoiceEntity.Status.PAID;
    inv.paidAt = Instant.now(clock);
    inv.paymentRef = ref.trim();
    return invoices.save(inv);
  }
}
