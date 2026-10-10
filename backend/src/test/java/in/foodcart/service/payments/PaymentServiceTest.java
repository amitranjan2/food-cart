package in.foodcart.service.payments;

import in.foodcart.data.*;
import in.foodcart.domain.OrderStatus;
import in.foodcart.service.CustomerHistory;
import in.foodcart.service.OrderNumbers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class PaymentServiceTest {
  private final OrderRepository orders = mock(OrderRepository.class);
  private final CustomerHistory history = mock(CustomerHistory.class);
  private final FakePaymentGateway fake = new FakePaymentGateway();
  private final OrderNumbers numbers = mock(OrderNumbers.class);
  private PaymentService payments;
  private OrderEntity order;
  private final Instant t0 = Instant.parse("2026-10-09T10:00:00Z");

  @SuppressWarnings("unchecked")
  @BeforeEach
  void setUp() {
    ObjectProvider<PaymentGateway> provider = mock(ObjectProvider.class);
    when(provider.getIfAvailable()).thenReturn(fake);
    payments = new PaymentService(provider, orders, history, numbers);
    when(numbers.next("v1")).thenReturn(1001L, 1002L);
    payments.clock = Clock.fixed(t0, ZoneOffset.UTC);
    order = new OrderEntity();
    order.id = "o1";
    order.vendorId = "v1";
    order.customerId = "c1";
    order.status = OrderStatus.PAYMENT_PENDING;
    order.total = new BigDecimal("160");
    when(orders.save(any())).thenAnswer(call -> call.getArgument(0));
    payments.start(order);
    when(orders.findByPayment_GatewayOrderId(order.payment.gatewayOrderId)).thenReturn(Optional.of(order));
  }

  private void webhook(String event, String amount) {
    String body = "{\"event\":\"" + event + "\",\"orderId\":\"" + order.payment.gatewayOrderId + "\",\"paymentId\":\"pay_1\",\"amount\":\"" + amount + "\"}";
    payments.handleWebhook("fake", body, Map.of(FakePaymentGateway.SIGNATURE_HEADER, fake.sign(body)));
  }

  @Test
  void startRecordsTheGatewayPaymentAndExpiry() {
    assertEquals("fake", order.payment.gateway);
    assertNotNull(order.payment.gatewayOrderId);
    assertEquals(t0.plus(PaymentService.PAY_WITHIN), order.payment.expiresAt);
    assertEquals(PaymentInfo.Status.PENDING, order.payment.status);
  }

  @Test
  void aCapturedPaymentPlacesTheOrderOnce() {
    webhook("payment.captured", "160");
    assertEquals(OrderStatus.PLACED, order.status);
    assertEquals(PaymentInfo.Status.PAID, order.payment.status);
    webhook("payment.captured", "160"); // gateways retry webhooks
    verify(history, times(1)).recordOrder(eq("c1"), eq("v1"), any());
    // The number is taken once, when the payment is confirmed.
    assertEquals(1001, order.orderNumber);
    verify(numbers, times(1)).next("v1");
  }

  @Test
  void ordersHaveNoNumberUntilPaid() {
    assertEquals(0, order.orderNumber);
    verify(numbers, never()).next(any());
  }

  @Test
  void aWebhookWithABadSignatureIsRejected() {
    String body = "{\"event\":\"payment.captured\",\"orderId\":\"" + order.payment.gatewayOrderId + "\",\"amount\":\"160\"}";
    assertThrows(SecurityException.class, () -> payments.handleWebhook("fake", body, Map.of(FakePaymentGateway.SIGNATURE_HEADER, "forged")));
    assertThrows(SecurityException.class, () -> payments.handleWebhook("fake", body, Map.of()));
    assertEquals(OrderStatus.PAYMENT_PENDING, order.status);
  }

  @Test
  void aWebhookForAnotherGatewayIsRejected() {
    assertThrows(IllegalArgumentException.class, () -> payments.handleWebhook("razorpay", "{}", Map.of()));
  }

  @Test
  void aWrongAmountIsRefundedAndNeverReachesTheVendor() {
    webhook("payment.captured", "100");
    assertEquals(OrderStatus.EXPIRED, order.status);
    assertEquals(PaymentInfo.Status.REFUNDED, order.payment.status);
    assertEquals(0, order.orderNumber);
  }

  @Test
  void aFailedPaymentLeavesTheOrderUnpaidAndARetryCanStillSucceed() {
    webhook("payment.failed", "160");
    assertEquals(OrderStatus.PAYMENT_PENDING, order.status);
    assertEquals(PaymentInfo.Status.FAILED, order.payment.status);
    assertEquals(0, order.orderNumber); // a failed try uses no number
    webhook("payment.captured", "160");
    assertEquals(OrderStatus.PLACED, order.status);
    assertEquals(1001, order.orderNumber);
  }

  @Test
  void unpaidOrdersExpireAndALatePaymentIsRefunded() {
    when(orders.findByStatusAndPayment_ExpiresAtBefore(OrderStatus.PAYMENT_PENDING, t0)).thenReturn(List.of(order));
    payments.expireUnpaid();
    assertEquals(OrderStatus.EXPIRED, order.status);
    webhook("payment.captured", "160");
    assertEquals(OrderStatus.EXPIRED, order.status);
    assertEquals(PaymentInfo.Status.REFUNDED, order.payment.status);
    verify(history, never()).recordOrder(any(), any(), any());
    verify(numbers, never()).next(any());
  }

  @Test
  void refundIfPaidRefundsOnlyPaidOrders() {
    payments.refundIfPaid(order);
    assertEquals(PaymentInfo.Status.PENDING, order.payment.status);
    webhook("payment.captured", "160");
    payments.refundIfPaid(order);
    assertEquals(PaymentInfo.Status.REFUNDED, order.payment.status);
    assertNotNull(order.payment.refundId);
  }
}
