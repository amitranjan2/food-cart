package in.foodcart.service.billing;

import in.foodcart.data.*;
import in.foodcart.domain.OrderStatus;
import in.foodcart.service.pricing.InvoiceNumbers;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class VendorCollectionsTest {
  private final VendorRepository vendors = mock(VendorRepository.class);
  private final OrderRepository orders = mock(OrderRepository.class);
  private final VendorCollectionRepository statements = mock(VendorCollectionRepository.class);
  private final InvoiceNumbers numbers = mock(InvoiceNumbers.class);
  private final List<VendorCollectionEntity> saved = new ArrayList<>();
  private final List<OrderEntity> collected = new ArrayList<>();
  private final VendorCollections collections = new VendorCollections(vendors, orders, statements, numbers);

  {
    VendorEntity stall = new VendorEntity();
    stall.id = "v1";
    when(vendors.findAll()).thenReturn(List.of(stall));
    when(orders.findByVendorIdAndPaymentMethodAndStatus("v1", "CASH", OrderStatus.COMPLETED)).thenReturn(collected);
    when(numbers.next(eq("SMC"), any())).thenReturn("SMC/26-27/000001");
    when(statements.existsByVendorIdAndPeriodStart(any(), any())).thenAnswer(call ->
        saved.stream().anyMatch(s -> s.periodStart.equals(call.getArgument(1))));
    when(statements.save(any())).thenAnswer(call -> {
      saved.add(call.getArgument(0));
      return call.getArgument(0);
    });
  }

  private OrderEntity cashOrder(long number, String collectedAt, String items, String gst) {
    OrderEntity o = new OrderEntity();
    o.orderNumber = number;
    o.paymentMethod = "CASH";
    o.status = OrderStatus.COMPLETED;
    o.cashCollectedAt = LocalDateTime.parse(collectedAt).atZone(ZoneId.of("Asia/Kolkata")).toInstant();
    o.bill = new OrderEntity.Bill();
    o.bill.itemTotal = new BigDecimal(items);
    o.bill.foodGst = new BigDecimal(gst);
    o.invoice = new OrderEntity.Invoice();
    o.invoice.foodNumber = "SMF/26-27/00000" + number;
    collected.add(o);
    return o;
  }

  @Test
  void aFinishedMonthsCashGstGoesOnOneStatement() {
    OrderEntity a = cashOrder(1, "2026-10-02T13:00", "160.00", "8.00");
    OrderEntity b = cashOrder(2, "2026-10-31T23:40", "70.00", "3.50");
    OrderEntity november = cashOrder(3, "2026-11-01T00:10", "100.00", "5.00");

    assertEquals(0, collections.run(LocalDate.of(2026, 10, 31)), "October isn't over");
    assertEquals(1, collections.run(LocalDate.of(2026, 11, 1)));
    VendorCollectionEntity s = saved.get(0);
    assertEquals(new BigDecimal("11.50"), s.total, "only the GST: the stall keeps the item total");
    assertEquals(new BigDecimal("230.00"), s.itemTotal);
    assertEquals(2, s.orders.size());
    assertEquals("SMF/26-27/000001", s.orders.get(0).invoiceNumber);
    assertEquals(LocalDate.of(2026, 11, 8), s.dueOn);
    assertEquals("SMC/26-27/000001", a.collectionNumber);
    assertEquals("SMC/26-27/000001", b.collectionNumber);
    assertNull(november.collectionNumber);

    assertEquals(0, collections.run(LocalDate.of(2026, 11, 2)), "safe to repeat");
  }

  @Test
  void onlineOrdersAndNoShowsOweNothing() {
    OrderEntity online = cashOrder(1, "2026-10-02T13:00", "160.00", "8.00");
    online.payment = new PaymentInfo();
    assertFalse(VendorCollections.owes(online));
    OrderEntity uncollected = cashOrder(2, "2026-10-02T13:00", "160.00", "8.00");
    uncollected.cashCollectedAt = null;
    assertFalse(VendorCollections.owes(uncollected));
    assertEquals(0, collections.run(LocalDate.of(2026, 11, 1)));
  }
}
