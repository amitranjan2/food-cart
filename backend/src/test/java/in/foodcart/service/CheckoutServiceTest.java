package in.foodcart.service;

import in.foodcart.data.*;
import in.foodcart.domain.OrderType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import in.foodcart.domain.OrderStatus;
import in.foodcart.service.payments.PaymentService;
import in.foodcart.service.slots.SlotRules;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class CheckoutServiceTest {
  private final VendorRepository vendors = mock(VendorRepository.class);
  private final MenuItemRepository items = mock(MenuItemRepository.class);
  private final OrderRepository orders = mock(OrderRepository.class);
  private final HistoryRepository history = mock(HistoryRepository.class);
  private final CustomerRepository customers = mock(CustomerRepository.class);
  private final PaymentService payments = mock(PaymentService.class);
  private final OrderNumbers numbers = mock(OrderNumbers.class);
  private final CustomerHistory customerHistory = mock(CustomerHistory.class);
  private final SubscriptionRepository subscriptionRepo = mock(SubscriptionRepository.class);
  private final in.foodcart.service.pricing.InvoiceNumbers invoices = mock(in.foodcart.service.pricing.InvoiceNumbers.class);
  private final CheckoutService checkout = new CheckoutService(vendors, items, orders, customers, payments,
      new in.foodcart.service.pricing.Pricing(new BigDecimal("5"), new BigDecimal("2.5"), new BigDecimal("18")), invoices, numbers, customerHistory, subscriptionRepo);

  @BeforeEach
  void setUp() {
    // Friday 9 Oct 2026, 14:10 in India.
    checkout.clock = Clock.fixed(Instant.parse("2026-10-09T08:40:00Z"), SlotRules.ZONE);
    VendorEntity vendor = new VendorEntity();
    vendor.id = "v1";
    for (DayOfWeek day : DayOfWeek.values()) vendor.openingHours.add(new OpeningHours(day, "10:00", "22:00"));
    when(vendors.findById("v1")).thenReturn(Optional.of(vendor));
    CustomerEntity customer = new CustomerEntity();
    customer.id = "c1";
    customer.mobile = "9876543210";
    customer.name = "Aakash";
    when(customers.findById("c1")).thenReturn(Optional.of(customer));
    MenuItemEntity momos = new MenuItemEntity();
    momos.id = "m1";
    momos.vendorId = "v1";
    momos.name = "Veg Momos";
    momos.price = new BigDecimal("80");
    when(items.findByIdAndVendorId("m1", "v1")).thenReturn(Optional.of(momos));
    when(history.findByCustomerIdAndVendorId("c1", "v1")).thenReturn(Optional.empty());
    when(orders.save(any())).thenAnswer(call -> call.getArgument(0));
    when(payments.onlineAvailable()).thenReturn(true);
    when(payments.cashAvailable()).thenReturn(true);
  }

  private CheckoutService.Request request(String displayedTotal) {
    return request("PICKUP", "2026-10-09T15:00", displayedTotal);
  }

  private CheckoutService.Request request(String type, String displayedTotal) {
    return request(type, "2026-10-09T15:00", displayedTotal);
  }

  private CheckoutService.Request request(String type, String slot, String displayedTotal) {
    CheckoutService.Line line = new CheckoutService.Line("m1", 2, new BigDecimal("80"), "FULL", null, List.of());
    return new CheckoutService.Request("v1", type, slot, displayedTotal == null ? null : new BigDecimal(displayedTotal), List.of(line), null);
  }

  @Test
  void chargesExactlyTheBillTheCustomerSaw() {
    // 2 × 80 = 160 + GST 8.00 + platform charges 4.20 + their GST 0.76 (BillRulesTest)
    OrderEntity order = checkout.create("c1", request("172.96"));
    assertEquals(0, order.total.compareTo(new BigDecimal("172.96")));
    assertEquals(0, order.subtotal.compareTo(new BigDecimal("160")), "the vendor's item total");
    assertEquals(0, order.bill.foodGst.compareTo(new BigDecimal("8.00")));
    assertEquals(0, order.bill.platformFeePercent.compareTo(new BigDecimal("2.5")));
  }

  @Test
  void toleratesFloatingPointNoiseFromTheBrowser() {
    OrderEntity order = checkout.create("c1", request("172.96000000000004"));
    assertEquals(0, order.total.compareTo(new BigDecimal("172.96")));
  }

  @Test
  void refusesAnOrderWhoseDisplayedTotalDiffers() {
    // e.g. a cart that charged only the items, or only items + GST
    assertThrows(IllegalStateException.class, () -> checkout.create("c1", request("160")));
    assertThrows(IllegalStateException.class, () -> checkout.create("c1", request("168")));
    verify(orders, never()).save(any());
  }

  @Test
  void refusesAnOrderWithoutADisplayedTotal() {
    assertThrows(IllegalStateException.class, () -> checkout.create("c1", request(null)));
    verify(orders, never()).save(any());
  }

  @Test
  void storesTheOrderTypeTheCustomerChose() {
    assertEquals(OrderType.DINE_IN, checkout.create("c1", request("DINE_IN", "172.96")).type);
    assertEquals(OrderType.PICKUP, checkout.create("c1", request("PICKUP", "172.96")).type);
  }

  @Test
  void refusesUnknownOrMissingOrderTypes() {
    for (String type : new String[] {"DELIVERY", "pickup", "", null}) {
      IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () -> checkout.create("c1", request(type, "172.96")));
      assertEquals("Choose Pick Up or Dine In.", e.getMessage());
    }
    verify(orders, never()).save(any());
  }

  @Test
  void storesTheChosenSlotAsAnInstant() {
    OrderEntity order = checkout.create("c1", request("PICKUP", "2026-10-09T15:00", "172.96"));
    assertEquals(Instant.parse("2026-10-09T09:30:00Z"), order.scheduledFor); // 15:00 IST
  }

  @Test
  void refusesSlotsThatAreNotOfferedNow() {
    // the current slot (14:00), outside hours (22:00), past, the day after tomorrow, malformed, missing
    for (String slot : new String[] {"2026-10-09T14:00", "2026-10-09T22:00", "2026-10-08T15:00", "2026-10-11T15:00", "3pm", "", null}) {
      assertThrows(RuntimeException.class, () -> checkout.create("c1", request("PICKUP", slot, "172.96")), "slot " + slot);
    }
    verify(orders, never()).save(any());
  }

  @Test
  void refusesOrdersWhenTheVendorHasNoHours() {
    vendors.findById("v1").orElseThrow().openingHours.clear();
    IllegalStateException e = assertThrows(IllegalStateException.class, () -> checkout.create("c1", request("172.96")));
    assertEquals("This vendor isn't taking orders for any time slot right now.", e.getMessage());
  }

  @Test
  void refusesOrdersFromCustomersWithoutAName() {
    customers.findById("c1").orElseThrow().name = " ";
    IllegalStateException e = assertThrows(IllegalStateException.class, () -> checkout.create("c1", request("172.96")));
    assertEquals("Add your name before paying.", e.getMessage());
    verify(orders, never()).save(any());
  }

  @Test
  void copiesTheCustomersNameOntoTheOrder() {
    assertEquals("Aakash", checkout.create("c1", request("172.96")).customerName);
  }

  @Test
  void newOrdersWaitForPaymentBeforeReachingTheVendor() {
    OrderEntity order = checkout.create("c1", request("172.96"));
    assertEquals(OrderStatus.PAYMENT_PENDING, order.status);
    assertEquals("ONLINE", order.paymentMethod);
    assertEquals(0, order.orderNumber); // numbered only once paid
  }

  @Test
  void rejectingAnOrderAsksForARefund() {
    OrderEntity placed = new OrderEntity();
    placed.id = "o1";
    placed.vendorId = "v1";
    placed.status = OrderStatus.PLACED;
    when(orders.findByIdAndVendorId("o1", "v1")).thenReturn(Optional.of(placed));
    checkout.status("v1", "o1", OrderStatus.REJECTED);
    verify(payments).refundIfPaid(placed);
  }

  @Test
  void unpaidOrdersCannotBeAcceptedByTheVendor() {
    OrderEntity unpaid = new OrderEntity();
    unpaid.id = "o2";
    unpaid.vendorId = "v1";
    unpaid.status = OrderStatus.PAYMENT_PENDING;
    when(orders.findByIdAndVendorId("o2", "v1")).thenReturn(Optional.of(unpaid));
    assertThrows(IllegalStateException.class, () -> checkout.status("v1", "o2", OrderStatus.ACCEPTED));
  }

  @Test
  void theHandoverCodeIsCreatedWhenTheVendorMarksTheOrderReady() {
    assertNull(checkout.create("c1", request("172.96")).handover);
    OrderEntity o = new OrderEntity();
    o.id = "o4";
    o.vendorId = "v1";
    o.status = OrderStatus.PREPARING;
    when(orders.findByIdAndVendorId("o4", "v1")).thenReturn(Optional.of(o));
    checkout.status("v1", "o4", OrderStatus.READY);
    assertTrue(o.handover.code.matches("[0-9]{4}"));
  }

  @Test
  void preparingOrdersCannotSkipReadyAndTheCode() {
    OrderEntity o = new OrderEntity();
    o.id = "o5";
    o.vendorId = "v1";
    o.status = OrderStatus.PREPARING;
    when(orders.findByIdAndVendorId("o5", "v1")).thenReturn(Optional.of(o));
    assertThrows(IllegalStateException.class, () -> checkout.status("v1", "o5", OrderStatus.COMPLETED));
    assertThrows(IllegalStateException.class, () -> checkout.handOver("v1", "o5", "1234"));
  }

  private OrderEntity readyOrder() {
    OrderEntity o = new OrderEntity();
    o.id = "o3";
    o.vendorId = "v1";
    o.status = OrderStatus.READY;
    o.handover = new Handover();
    o.handover.code = "2905";
    when(orders.findByIdAndVendorId("o3", "v1")).thenReturn(Optional.of(o));
    return o;
  }

  @Test
  void theVendorCompletesAnOrderOnlyWithTheCustomersCode() {
    OrderEntity o = readyOrder();
    IllegalArgumentException wrong = assertThrows(IllegalArgumentException.class, () -> checkout.handOver("v1", "o3", "1111"));
    assertEquals("Wrong code. 4 tries left.", wrong.getMessage());
    assertEquals(OrderStatus.READY, o.status);
    verify(invoices, never()).issue(any(), any());
    checkout.handOver("v1", "o3", "2905");
    assertEquals(OrderStatus.COMPLETED, o.status);
    assertEquals("VENDOR", o.handover.verifiedByRole);
    assertNotNull(o.completedAt);
    verify(invoices).issue(o, o.completedAt);
  }

  @Test
  void markingCompletedWithoutTheCodeIsRefused() {
    readyOrder();
    IllegalStateException e = assertThrows(IllegalStateException.class, () -> checkout.status("v1", "o3", OrderStatus.COMPLETED));
    assertEquals("Enter the customer's handover code to complete this order.", e.getMessage());
  }

  @Test
  void ordersThatAreNotReadyCannotBeHandedOver() {
    readyOrder().status = OrderStatus.PREPARING;
    assertThrows(IllegalStateException.class, () -> checkout.handOver("v1", "o3", "2905"));
  }

  // Pay at the stall (tracker S2.19)

  private CheckoutService.Request cash(String displayedTotal) {
    CheckoutService.Line line = new CheckoutService.Line("m1", 2, new BigDecimal("80"), "FULL", null, List.of());
    return new CheckoutService.Request("v1", "PICKUP", "2026-10-09T15:00", new BigDecimal(displayedTotal), List.of(line), "CASH");
  }

  @Test
  void payAtStallBillsItemsAndGstWithoutPlatformCharges() {
    when(numbers.next("v1")).thenReturn(7L);
    OrderEntity o = checkout.create("c1", cash("168.00"));
    assertEquals(0, o.total.compareTo(new BigDecimal("168.00")), "160 + 5% GST, no platform charges");
    assertEquals(0, o.bill.platformFee.signum());
    assertEquals("CASH", o.paymentMethod);
    assertTrue(o.cash());
    assertEquals(OrderStatus.PLACED, o.status, "no payment to wait for: the stall sees it now");
    assertEquals(7L, o.orderNumber);
    verify(customerHistory).recordOrder(eq("c1"), eq("v1"), any());
    assertThrows(IllegalStateException.class, () -> checkout.create("c1", cash("172.96")), "the online bill is refused for cash");
  }

  @Test
  void onlineIsRefusedWhileNoGatewayIsSetUp() {
    when(payments.onlineAvailable()).thenReturn(false);
    IllegalStateException e = assertThrows(IllegalStateException.class, () -> checkout.create("c1", request("172.96")));
    assertEquals("Online payment isn't available yet. Choose pay at the stall.", e.getMessage());
  }

  @Test
  void aCustomerMayHaveOnlyTwoPayAtStallOrdersWaiting() {
    when(orders.countByCustomerIdAndPaymentMethodAndStatusInAndScheduledForAfter(eq("c1"), eq("CASH"), any(), any())).thenReturn(2L);
    IllegalStateException e = assertThrows(IllegalStateException.class, () -> checkout.create("c1", cash("168.00")));
    assertTrue(e.getMessage().startsWith("You already have 2 pay-at-stall orders waiting"));
  }

  @Test
  void twoNoShowsTurnPayAtStallOffForTheNumber() {
    customers.findById("c1").orElseThrow().noShows = 2;
    IllegalStateException e = assertThrows(IllegalStateException.class, () -> checkout.create("c1", cash("168.00")));
    assertTrue(e.getMessage().startsWith("Pay at the stall is off for this number"));
  }

  private OrderEntity acceptedCashOrder() {
    OrderEntity o = new OrderEntity();
    o.id = "o9";
    o.vendorId = "v1";
    o.customerId = "c1";
    o.paymentMethod = "CASH";
    o.status = OrderStatus.ACCEPTED;
    o.scheduledFor = Instant.parse("2026-10-09T08:00:00Z"); // 13:30 India; the clock says 14:10
    when(orders.findByIdAndVendorId("o9", "v1")).thenReturn(Optional.of(o));
    return o;
  }

  @Test
  void theStallMarksANoShowHalfAnHourAfterThePickupTime() {
    OrderEntity o = acceptedCashOrder();
    checkout.status("v1", "o9", OrderStatus.NO_SHOW);
    assertEquals(OrderStatus.NO_SHOW, o.status);
    assertNotNull(o.noShowAt);
    assertEquals(1, customers.findById("c1").orElseThrow().noShows);
    verify(invoices, never()).issue(any(), any());
  }

  @Test
  void aNoShowCantBeMarkedBeforeHalfAnHourPassed() {
    OrderEntity o = acceptedCashOrder();
    o.scheduledFor = Instant.parse("2026-10-09T08:30:00Z"); // 14:00 India: only 10 minutes ago
    IllegalStateException e = assertThrows(IllegalStateException.class, () -> checkout.status("v1", "o9", OrderStatus.NO_SHOW));
    assertTrue(e.getMessage().startsWith("Wait 21 more minutes"), e.getMessage());
    assertEquals(OrderStatus.ACCEPTED, o.status);
  }

  @Test
  void paidOnlineOrdersCantBeMarkedAsNoShows() {
    OrderEntity o = acceptedCashOrder();
    o.paymentMethod = "ONLINE";
    o.payment = new PaymentInfo();
    assertThrows(IllegalStateException.class, () -> checkout.status("v1", "o9", OrderStatus.NO_SHOW));
  }

  @Test
  void handingOverAPayAtStallOrderRecordsTheCash() {
    OrderEntity o = readyOrder();
    o.paymentMethod = "CASH";
    checkout.handOver("v1", "o3", "2905");
    assertEquals(o.completedAt, o.cashCollectedAt);
  }
}
