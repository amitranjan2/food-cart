package in.foodcart.service;

import in.foodcart.data.*;
import in.foodcart.domain.OrderStatus;
import in.foodcart.service.payments.PaymentService;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class SupportRefundsTest {
  private final VendorRepository vendors = mock(VendorRepository.class);
  private final OrderRepository orders = mock(OrderRepository.class);
  private final PaymentService payments = mock(PaymentService.class);
  private final SupportActionRepository actions = mock(SupportActionRepository.class);
  private final SupportRefunds refunds = new SupportRefunds(vendors, orders, payments, actions);

  private OrderEntity order(OrderStatus status, PaymentInfo.Status paid) {
    VendorEntity v = new VendorEntity();
    v.id = "v1";
    v.slug = "raju-momos";
    v.name = "Raju Momos";
    when(vendors.findBySlug("raju-momos")).thenReturn(Optional.of(v));
    OrderEntity o = new OrderEntity();
    o.id = "o1";
    o.vendorId = "v1";
    o.orderNumber = 1043;
    o.status = status;
    o.total = new BigDecimal("70");
    o.payment = new PaymentInfo();
    o.payment.status = paid;
    when(orders.findByVendorIdAndOrderNumber("v1", 1043)).thenReturn(Optional.of(o));
    return o;
  }

  @Test
  void refundsAPaidOrderNotYetHandedOverAndKeepsTheReasonOffTheOrder() {
    for (OrderStatus status : List.of(OrderStatus.PLACED, OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY)) {
      OrderEntity o = order(status, PaymentInfo.Status.PAID);
      refunds.refund("raju-momos", 1043, "Ran out of momos, confirmed on call");
      assertEquals(OrderStatus.CANCELLED, o.status, status.name());
      assertEquals("SUPPORT", o.cancelledBy);
      assertNotNull(o.cancelledAt);
      verify(payments).refundIfPaid(o);
    }
    verify(actions, times(4)).save(argThat(a -> "REFUND".equals(a.action) && a.reason.startsWith("Ran out") && a.orderNumber == 1043));
  }

  @Test
  void refusesFinishedUnpaidOrUnexplainedRefunds() {
    for (OrderStatus done : List.of(OrderStatus.COMPLETED, OrderStatus.REJECTED, OrderStatus.CANCELLED, OrderStatus.EXPIRED)) {
      order(done, PaymentInfo.Status.PAID);
      assertThrows(IllegalStateException.class, () -> refunds.refund("raju-momos", 1043, "Customer called"), done.name());
    }
    order(OrderStatus.ACCEPTED, PaymentInfo.Status.REFUNDED);
    assertThrows(IllegalStateException.class, () -> refunds.refund("raju-momos", 1043, "Customer called"), "already refunded");
    order(OrderStatus.ACCEPTED, PaymentInfo.Status.PAID);
    assertThrows(IllegalArgumentException.class, () -> refunds.refund("raju-momos", 1043, " ok "));
    assertThrows(IllegalArgumentException.class, () -> refunds.refund("raju-momos", 9999, "Customer called"));
    assertThrows(IllegalArgumentException.class, () -> refunds.refund("nobody", 1043, "Customer called"));
    verify(payments, never()).refundIfPaid(any());
    verify(actions, never()).save(any());
  }

  @Test
  void describeSaysWhetherItCanBeRefunded() {
    order(OrderStatus.READY, PaymentInfo.Status.PAID);
    assertEquals(true, refunds.describe("raju-momos", 1043).get("refundable"));
    order(OrderStatus.COMPLETED, PaymentInfo.Status.PAID);
    assertEquals(false, refunds.describe("raju-momos", 1043).get("refundable"));
  }
}
