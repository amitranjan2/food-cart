package in.foodcart.service;

import in.foodcart.data.*;
import in.foodcart.domain.OrderType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class CheckoutServiceTest {
  private final VendorRepository vendors = mock(VendorRepository.class);
  private final MenuItemRepository items = mock(MenuItemRepository.class);
  private final OrderRepository orders = mock(OrderRepository.class);
  private final HistoryRepository history = mock(HistoryRepository.class);
  private final CustomerRepository customers = mock(CustomerRepository.class);
  private final CheckoutService checkout = new CheckoutService(vendors, items, orders, history, customers);

  @BeforeEach
  void setUp() {
    VendorEntity vendor = new VendorEntity();
    vendor.id = "v1";
    when(vendors.findById("v1")).thenReturn(Optional.of(vendor));
    CustomerEntity customer = new CustomerEntity();
    customer.id = "c1";
    customer.mobile = "9876543210";
    when(customers.findById("c1")).thenReturn(Optional.of(customer));
    MenuItemEntity momos = new MenuItemEntity();
    momos.id = "m1";
    momos.vendorId = "v1";
    momos.name = "Veg Momos";
    momos.price = new BigDecimal("80");
    when(items.findByIdAndVendorId("m1", "v1")).thenReturn(Optional.of(momos));
    when(history.findByCustomerIdAndVendorId("c1", "v1")).thenReturn(Optional.empty());
    when(orders.save(any())).thenAnswer(call -> call.getArgument(0));
  }

  private CheckoutService.Request request(String displayedTotal) {
    return request("PICKUP", displayedTotal);
  }

  private CheckoutService.Request request(String type, String displayedTotal) {
    CheckoutService.Line line = new CheckoutService.Line("m1", 2, new BigDecimal("80"), "FULL", null, List.of());
    return new CheckoutService.Request("v1", type, displayedTotal == null ? null : new BigDecimal(displayedTotal), List.of(line));
  }

  @Test
  void chargesExactlyTheItemTotalTheCustomerSaw() {
    OrderEntity order = checkout.create("c1", request("160"));
    assertEquals(0, order.total.compareTo(new BigDecimal("160")));
    assertEquals(0, order.subtotal.compareTo(order.total));
  }

  @Test
  void toleratesFloatingPointNoiseFromTheBrowser() {
    OrderEntity order = checkout.create("c1", request("160.00000000000003"));
    assertEquals(0, order.total.compareTo(new BigDecimal("160")));
  }

  @Test
  void refusesAnOrderWhoseDisplayedTotalDiffers() {
    // e.g. the old cart showed 160 + 5% tax = 168
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
    assertEquals(OrderType.DINE_IN, checkout.create("c1", request("DINE_IN", "160")).type);
    assertEquals(OrderType.PICKUP, checkout.create("c1", request("PICKUP", "160")).type);
  }

  @Test
  void refusesUnknownOrMissingOrderTypes() {
    for (String type : new String[] {"DELIVERY", "pickup", "", null}) {
      IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () -> checkout.create("c1", request(type, "160")));
      assertEquals("Choose Pick Up or Dine In.", e.getMessage());
    }
    verify(orders, never()).save(any());
  }
}
