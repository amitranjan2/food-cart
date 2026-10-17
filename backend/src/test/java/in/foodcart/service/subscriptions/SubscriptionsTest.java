package in.foodcart.service.subscriptions;

import in.foodcart.data.*;
import in.foodcart.service.CheckoutService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DuplicateKeyException;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class SubscriptionsTest {
  private static final ZoneId IST = ZoneId.of("Asia/Kolkata");
  private final SubscriptionRepository subscriptions = mock(SubscriptionRepository.class);
  private final SubscriptionRunRepository runs = mock(SubscriptionRunRepository.class);
  private final VendorRepository vendors = mock(VendorRepository.class);
  private final CustomerRepository customers = mock(CustomerRepository.class);
  private final MenuItemRepository items = mock(MenuItemRepository.class);
  private final OrderRepository orders = mock(OrderRepository.class);
  private final CheckoutService checkout = mock(CheckoutService.class);
  private final Subscriptions service = new Subscriptions(subscriptions, runs, vendors, customers, items, orders, checkout);
  private final List<SubscriptionEntity> saved = new ArrayList<>();
  private final Map<LocalDate, SubscriptionRunEntity> runByDate = new HashMap<>();
  private final VendorEntity vendor = new VendorEntity();
  private final CustomerEntity customer = new CustomerEntity();

  {
    vendor.id = "v1";
    vendor.name = "Raju Momos";
    for (DayOfWeek d : DayOfWeek.values()) vendor.openingHours.add(new OpeningHours(d, "10:00", "22:00"));
    customer.id = "c1";
    customer.name = "Aakash";
    customer.mobile = "9876543210";
    when(vendors.findById("v1")).thenReturn(Optional.of(vendor));
    when(customers.findById("c1")).thenReturn(Optional.of(customer));
    when(subscriptions.save(any())).thenAnswer(call -> {
      SubscriptionEntity s = call.getArgument(0);
      if (s.id == null) s.id = "s1";
      if (!saved.contains(s)) saved.add(s);
      return s;
    });
    when(checkout.quoteAtStall(eq("v1"), any())).thenReturn(new BigDecimal("168.00"));
    when(runs.findBySubscriptionIdAndDate(any(), any())).thenAnswer(call -> Optional.ofNullable(runByDate.get((LocalDate) call.getArgument(1))));
    when(runs.save(any())).thenAnswer(call -> {
      SubscriptionRunEntity r = call.getArgument(0);
      if (r.id == null) r.id = "r" + runByDate.size();
      runByDate.put(r.date, r);
      return r;
    });
    when(items.findById(any())).thenReturn(Optional.empty());
    service.clock = Clock.fixed(Instant.parse("2026-10-12T06:30:00Z"), IST); // Monday 12:00 IST... overridden per test
  }

  private void clock(String isoLocal) {
    service.clock = Clock.fixed(LocalDateTime.parse(isoLocal).atZone(IST).toInstant(), IST);
  }

  private Subscriptions.Create request(String time, String... days) {
    return new Subscriptions.Create("v1", "PICKUP", List.of(days), time,
        List.of(new CheckoutService.Line("m1", 2, new BigDecimal("80"), "FULL", null, List.of())), new BigDecimal("168"));
  }

  private SubscriptionEntity active() {
    SubscriptionEntity s = new SubscriptionEntity();
    s.id = "s1";
    s.customerId = "c1";
    s.vendorId = "v1";
    s.type = "PICKUP";
    s.days = List.of(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY);
    s.time = "12:00";
    s.activeFrom = LocalDateTime.parse("2026-10-11T09:00").atZone(IST).toInstant();
    SubscriptionEntity.Line l = new SubscriptionEntity.Line();
    l.menuItemId = "m1";
    l.quantity = 2;
    l.portion = "FULL";
    s.lines = List.of(l);
    when(subscriptions.findByStatus(SubscriptionEntity.Status.ACTIVE)).thenReturn(List.of(s));
    when(subscriptions.findByIdAndCustomerId("s1", "c1")).thenReturn(Optional.of(s));
    return s;
  }

  @Test
  void createsAWeeklyOrderForTheDaysAndTimeTheStallOffers() {
    SubscriptionEntity s = service.create("c1", request("12:00", "wednesday", "MONDAY"));
    assertEquals(List.of(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY), s.days, "sorted, case ignored");
    assertEquals("12:00", s.time);
    assertEquals(new BigDecimal("168.00"), s.quotedTotal);
    assertEquals(SubscriptionEntity.Status.ACTIVE, s.status);
    assertEquals(1, s.lines.size());
    assertEquals(2, s.lines.get(0).quantity);
  }

  @Test
  void refusesATimeTheStallDoesNotOffer() {
    IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () -> service.create("c1", request("23:00", "MONDAY")));
    assertTrue(e.getMessage().contains("Raju Momos doesn't take orders at 23:00 on Monday"));
    assertThrows(IllegalArgumentException.class, () -> service.create("c1", request("12:15", "MONDAY")));
  }

  @Test
  void refusesNoDaysUnknownDaysAndAChangedPrice() {
    assertThrows(IllegalArgumentException.class, () -> service.create("c1", request("12:00")));
    assertThrows(IllegalArgumentException.class, () -> service.create("c1", request("12:00", "FUNDAY")));
    when(checkout.quoteAtStall(eq("v1"), any())).thenReturn(new BigDecimal("175.00"));
    assertThrows(IllegalStateException.class, () -> service.create("c1", request("12:00", "MONDAY")));
  }

  @Test
  void aCustomerHoldsAtMostThreeAndNeedsPayAtTheStallToBeOn() {
    when(subscriptions.countByCustomerIdAndStatusIn(eq("c1"), any())).thenReturn(3L);
    assertTrue(assertThrows(IllegalStateException.class, () -> service.create("c1", request("12:00", "MONDAY"))).getMessage().contains("3 weekly orders"));
    when(subscriptions.countByCustomerIdAndStatusIn(eq("c1"), any())).thenReturn(0L);
    customer.noShows = 2;
    assertTrue(assertThrows(IllegalStateException.class, () -> service.create("c1", request("12:00", "MONDAY"))).getMessage().contains("Pay at the stall is off"));
  }

  @Test
  void placesTheOrderTwelveHoursAheadAndOnlyOnce() {
    SubscriptionEntity s = active();
    OrderEntity order = new OrderEntity();
    order.id = "o1";
    when(checkout.createScheduled(eq("c1"), any(), eq("s1"))).thenReturn(order);

    assertEquals(0, service.runDue(LocalDateTime.parse("2026-10-11T23:59")), "not yet");
    assertEquals(1, service.runDue(LocalDateTime.parse("2026-10-12T00:05")));
    assertEquals(0, service.runDue(LocalDateTime.parse("2026-10-12T00:10")), "the same day is never placed twice");

    ArgumentCaptor<CheckoutService.Request> request = ArgumentCaptor.forClass(CheckoutService.Request.class);
    verify(checkout, times(1)).createScheduled(eq("c1"), request.capture(), eq("s1"));
    assertEquals("2026-10-12T12:00", request.getValue().slot());
    assertEquals("CASH", request.getValue().paymentMethod());
    assertNull(request.getValue().items().get(0).displayedPrice(), "priced from the menu now, not from an old cart");
    assertEquals(SubscriptionRunEntity.Outcome.ORDERED, runByDate.get(LocalDate.parse("2026-10-12")).outcome);
    assertEquals("o1", runByDate.get(LocalDate.parse("2026-10-12")).orderId);
  }

  @Test
  void aSecondServerLosingTheRaceDoesNotPlaceADuplicate() {
    active();
    doThrow(new DuplicateKeyException("one_run_per_day")).when(runs).save(any());
    assertEquals(0, service.runDue(LocalDateTime.parse("2026-10-12T00:05")));
    verify(checkout, never()).createScheduled(any(), any(), any());
  }

  @Test
  void anOccurrenceThatCantBePlacedIsSkippedWithTheReason() {
    active();
    when(checkout.createScheduled(any(), any(), any())).thenThrow(new IllegalStateException("Raju Momos is switched off."));
    assertEquals(0, service.runDue(LocalDateTime.parse("2026-10-12T00:05")));
    SubscriptionRunEntity run = runByDate.get(LocalDate.parse("2026-10-12"));
    assertEquals(SubscriptionRunEntity.Outcome.SKIPPED, run.outcome);
    assertEquals("Raju Momos is switched off.", run.reason);
  }

  @Test
  void aMissedOccurrenceIsRecordedNotPlacedLate() {
    active();
    assertEquals(0, service.runDue(LocalDateTime.parse("2026-10-12T11:40")));
    verify(checkout, never()).createScheduled(any(), any(), any());
    assertEquals(SubscriptionRunEntity.Outcome.SKIPPED, runByDate.get(LocalDate.parse("2026-10-12")).outcome);
    assertEquals("We couldn't place this one in time.", runByDate.get(LocalDate.parse("2026-10-12")).reason);
  }

  @Test
  void skippingWorksUntilTheOrderIsPlacedThenNot() {
    SubscriptionEntity s = active();
    clock("2026-10-11T20:00");
    service.skip("c1", "s1", LocalDate.parse("2026-10-12"));
    assertEquals(List.of(LocalDate.parse("2026-10-12")), s.skips);
    assertEquals(0, service.runDue(LocalDateTime.parse("2026-10-12T00:05")), "a skipped day isn't placed");
    service.unskip("c1", "s1", LocalDate.parse("2026-10-12"));
    assertTrue(s.skips.isEmpty());

    clock("2026-10-12T00:30");
    assertThrows(IllegalStateException.class, () -> service.skip("c1", "s1", LocalDate.parse("2026-10-12")), "already with the stall");
    assertThrows(IllegalArgumentException.class, () -> service.skip("c1", "s1", LocalDate.parse("2026-10-13")), "Tuesday isn't one of the days");
  }

  @Test
  void pauseStopsOrdersAndResumeStartsFromTheNextOneFarEnoughAhead() {
    SubscriptionEntity s = active();
    clock("2026-10-12T08:00");
    service.pause("c1", "s1");
    assertEquals(SubscriptionEntity.Status.PAUSED, s.status);
    assertEquals("CUSTOMER", s.pauseReason);
    service.resume("c1", "s1");
    assertEquals(SubscriptionEntity.Status.ACTIVE, s.status);
    assertNull(s.pauseReason);
    assertEquals(LocalDateTime.parse("2026-10-12T08:00").atZone(IST).toInstant(), s.activeFrom);
    assertFalse(SubscriptionRules.scheduled(s, LocalDate.parse("2026-10-12")), "today's noon is too soon after resuming");
    assertTrue(SubscriptionRules.scheduled(s, LocalDate.parse("2026-10-14")));
  }

  @Test
  void resumeIsRefusedWhilePayAtTheStallIsOff() {
    SubscriptionEntity s = active();
    s.status = SubscriptionEntity.Status.PAUSED;
    customer.noShows = 2;
    assertThrows(IllegalStateException.class, () -> service.resume("c1", "s1"));
    assertEquals(SubscriptionEntity.Status.PAUSED, s.status);
  }

  @Test
  void aCancelledWeeklyOrderCantBeChangedAndAnotherCustomersIsNotFound() {
    SubscriptionEntity s = active();
    service.cancel("c1", "s1");
    assertEquals(SubscriptionEntity.Status.CANCELLED, s.status);
    assertThrows(IllegalStateException.class, () -> service.pause("c1", "s1"));
    when(subscriptions.findByIdAndCustomerId("s1", "c2")).thenReturn(Optional.empty());
    assertThrows(IllegalArgumentException.class, () -> service.pause("c2", "s1"));
  }

  @Test
  void theListShowsTheNextOccurrencesWithWhatCanBeSkipped() {
    SubscriptionEntity s = active();
    clock("2026-10-12T14:00");
    when(subscriptions.findByCustomerIdAndStatusInOrderByCreatedAtDesc(eq("c1"), any())).thenReturn(List.of(s));
    List<Map<String, Object>> list = service.list("c1");
    @SuppressWarnings("unchecked") List<Map<String, Object>> next = (List<Map<String, Object>>) list.get(0).get("next");
    assertEquals("2026-10-12", next.get(0).get("date"), "Monday noon pickup within the last 3 hours is still shown");
    assertEquals(false, next.get(0).get("canSkip"));
    assertEquals("2026-10-14", next.get(1).get("date"));
    assertEquals(true, next.get(1).get("canSkip"), "Wednesday noon is placed from Wednesday midnight, so on Monday it can still be skipped");
  }
}
