package in.foodcart.service.billing;

import in.foodcart.data.*;
import in.foodcart.domain.OrderStatus;
import in.foodcart.domain.VendorPlan;
import in.foodcart.domain.VendorReview;
import in.foodcart.service.pricing.InvoiceNumbers;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class VendorBillingTest {
  private final VendorRepository vendors = mock(VendorRepository.class);
  private final OrderRepository orders = mock(OrderRepository.class);
  private final VendorInvoiceRepository invoices = mock(VendorInvoiceRepository.class);
  private final VendorBusinessRepository business = mock(VendorBusinessRepository.class);
  private final InvoiceNumbers numbers = mock(InvoiceNumbers.class);
  private final List<VendorInvoiceEntity> saved = new ArrayList<>();
  private final VendorEntity stall = new VendorEntity();
  private final List<OrderEntity> sold = new ArrayList<>();
  private int counter;

  {
    stall.id = "v1";
    stall.name = "Raju Momos";
    stall.review = VendorReview.APPROVED;
    stall.createdAt = Instant.parse("2026-09-01T00:00:00Z");
    when(vendors.findAll()).thenReturn(List.of(stall));
    when(vendors.findById("v1")).thenReturn(Optional.of(stall));
    when(orders.findByVendorIdOrderByCreatedAtDesc("v1")).thenReturn(sold);
    when(business.findById(any())).thenReturn(Optional.empty());
    when(numbers.next(eq("SMV"), any())).thenAnswer(call -> "SMV/26-27/" + String.format("%06d", ++counter));
    when(invoices.existsByVendorIdAndPlanAndPeriodStart(any(), any(), any())).thenAnswer(call ->
        saved.stream().anyMatch(i -> i.vendorId.equals(call.getArgument(0)) && i.plan == call.getArgument(1) && i.periodStart.equals(call.getArgument(2))));
    when(invoices.save(any())).thenAnswer(call -> {
      saved.add(call.getArgument(0));
      return call.getArgument(0);
    });
  }

  private VendorBilling billing(String start, String testMobiles) {
    return new VendorBilling(vendors, orders, invoices, business, numbers, new BigDecimal("100"), new BigDecimal("2500"), new BigDecimal("25000"),
        new BigDecimal("18"), start, testMobiles, "", "Crestway Properties Private Limited", "Narnaul, Haryana", "06AAMCC1614M1ZL", "");
  }

  private static <T> T eq(T value) {
    return org.mockito.ArgumentMatchers.eq(value);
  }

  /** An order paid at this India time. */
  private void paid(String indiaTime, OrderStatus status, PaymentInfo.Status payment, String mobile) {
    OrderEntity o = new OrderEntity();
    o.status = status;
    o.customerMobile = mobile;
    o.payment = new PaymentInfo();
    o.payment.status = payment;
    o.payment.paidAt = LocalDateTime.parse(indiaTime).atZone(ZoneId.of("Asia/Kolkata")).toInstant();
    sold.add(o);
  }

  @Test
  void dailyChargesEachDayWithARealSaleAfterTheMonthEnds() {
    paid("2026-10-02T09:00", OrderStatus.COMPLETED, PaymentInfo.Status.PAID, "9876543210");
    paid("2026-10-02T19:00", OrderStatus.ACCEPTED, PaymentInfo.Status.PAID, "9876543211"); // same day: counted once
    paid("2026-10-05T23:50", OrderStatus.READY, PaymentInfo.Status.PAID, "9876543210");
    paid("2026-10-06T10:00", OrderStatus.REJECTED, PaymentInfo.Status.REFUNDED, "9876543210"); // rejected: not a sale
    paid("2026-10-07T10:00", OrderStatus.CANCELLED, PaymentInfo.Status.REFUNDED, "9876543210"); // support refund
    paid("2026-10-08T10:00", OrderStatus.COMPLETED, PaymentInfo.Status.PAID, "9999999999"); // team's test number
    paid("2026-09-30T23:59", OrderStatus.COMPLETED, PaymentInfo.Status.PAID, "9876543210"); // before billing start
    VendorBilling b = billing("2026-10-01", "9999999999");

    assertEquals(0, b.run(LocalDate.of(2026, 10, 31)), "the month isn't over yet");
    assertEquals(1, b.run(LocalDate.of(2026, 11, 1)));
    VendorInvoiceEntity inv = saved.get(0);
    assertEquals(List.of(LocalDate.of(2026, 10, 2), LocalDate.of(2026, 10, 5)), inv.chargeDays);
    assertEquals(new BigDecimal("200.00"), inv.taxable);
    assertEquals(new BigDecimal("18.00"), inv.cgst);
    assertEquals(new BigDecimal("18.00"), inv.sgst);
    assertEquals(new BigDecimal("236.00"), inv.total);
    assertEquals(LocalDate.of(2026, 11, 8), inv.dueOn);
    assertEquals(0, b.run(LocalDate.of(2026, 11, 2)), "running again issues nothing");
  }

  @Test
  @SuppressWarnings("unchecked")
  void statusNamesWhoIssuesTheInvoices() {
    Map<String, String> seller = (Map<String, String>) billing("2026-10-01", "").status("v1").get("seller");
    assertEquals("Crestway Properties Private Limited", seller.get("name"));
    assertEquals("06AAMCC1614M1ZL", seller.get("gstin"));
    assertNull(seller.get("sac"), "blank until the CA confirms it");
  }

  @Test
  void aDailyMonthWithoutSalesHasNoInvoice() {
    assertEquals(0, billing("2026-10-01", "").run(LocalDate.of(2026, 11, 1)));
  }

  @Test
  void monthlyIsBilledAtTheStartOfEachMonth() {
    stall.planSteps.add(new VendorEntity.PlanStep(VendorPlan.MONTHLY, "2026-11"));
    VendorBilling b = billing("2026-10-01", "");
    assertEquals(0, b.run(LocalDate.of(2026, 10, 20)), "still daily in October, no sales");
    assertEquals(1, b.run(LocalDate.of(2026, 11, 1)));
    assertEquals(new BigDecimal("2950.00"), saved.get(0).total);
    assertEquals(LocalDate.of(2026, 11, 30), saved.get(0).periodEnd);
    assertEquals(1, b.run(LocalDate.of(2026, 12, 1)));
    assertEquals(0, b.run(LocalDate.of(2026, 12, 15)));
  }

  @Test
  void yearlyIsBilledOncePerTwelveMonthTerm() {
    stall.planSteps.add(new VendorEntity.PlanStep(VendorPlan.YEARLY, "2026-11"));
    VendorBilling b = billing("2026-10-01", "");
    assertEquals(1, b.run(LocalDate.of(2026, 11, 1)));
    assertEquals(new BigDecimal("29500.00"), saved.get(0).total);
    assertEquals(LocalDate.of(2027, 10, 31), saved.get(0).periodEnd);
    assertEquals(0, b.run(LocalDate.of(2027, 6, 1)));
    assertEquals(1, b.run(LocalDate.of(2027, 11, 1)), "the next term");
  }

  @Test
  void offUntilAStartDateAndOnlyForLiveStalls() {
    stall.planSteps.add(new VendorEntity.PlanStep(VendorPlan.MONTHLY, "2026-11"));
    assertEquals(0, billing("", "").run(LocalDate.of(2026, 11, 1)), "billing off");
    stall.review = VendorReview.SUBMITTED;
    assertEquals(0, billing("2026-10-01", "").run(LocalDate.of(2026, 11, 1)), "not live yet");
  }

  @Test
  void aStallApprovedLaterIsChargedFromItsApprovalDay() {
    stall.reviewedAt = LocalDateTime.parse("2026-10-10T12:00").atZone(ZoneId.of("Asia/Kolkata")).toInstant();
    paid("2026-10-09T10:00", OrderStatus.COMPLETED, PaymentInfo.Status.PAID, "9876543210");
    paid("2026-10-10T18:00", OrderStatus.COMPLETED, PaymentInfo.Status.PAID, "9876543210");
    billing("2026-10-01", "").run(LocalDate.of(2026, 11, 1));
    assertEquals(List.of(LocalDate.of(2026, 10, 10)), saved.get(0).chargeDays);
  }

  @Test
  void markingPaidNeedsAReference() {
    VendorInvoiceEntity inv = new VendorInvoiceEntity();
    inv.number = "SMV/26-27/000001";
    when(invoices.findByNumber("SMV/26-27/000001")).thenReturn(Optional.of(inv));
    VendorBilling b = billing("2026-10-01", "");
    assertThrows(IllegalArgumentException.class, () -> b.markPaid("SMV/26-27/000001", "x"));
    b.markPaid("SMV/26-27/000001", "UPI 412345678901");
    assertEquals(VendorInvoiceEntity.Status.PAID, inv.status);
    assertThrows(IllegalStateException.class, () -> b.markPaid("SMV/26-27/000001", "UPI 412345678901"));
  }

  @Test
  void aPayAtStallOrderCountsOnTheDayItWasPlacedOnceCollected() {
    OrderEntity collected = new OrderEntity();
    collected.vendorId = "v1";
    collected.paymentMethod = "CASH";
    collected.status = OrderStatus.COMPLETED;
    collected.customerMobile = "9876543210";
    collected.createdAt = Instant.parse("2026-10-03T06:00:00Z");
    collected.cashCollectedAt = Instant.parse("2026-10-03T07:00:00Z");
    OrderEntity noShow = new OrderEntity();
    noShow.vendorId = "v1";
    noShow.paymentMethod = "CASH";
    noShow.status = OrderStatus.NO_SHOW;
    noShow.customerMobile = "9876543210";
    noShow.createdAt = Instant.parse("2026-10-04T06:00:00Z");
    TreeSet<LocalDate> days = ChargeDays.in(List.of(collected, noShow), YearMonth.of(2026, 10), Set.of(), LocalDate.of(2026, 10, 1));
    assertEquals(new TreeSet<>(List.of(LocalDate.of(2026, 10, 3))), days);
  }
}
