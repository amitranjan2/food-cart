package in.foodcart.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import in.foodcart.data.OrderRepository;
import in.foodcart.service.payments.FakePaymentGateway;
import in.foodcart.service.payments.PaymentService;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/** Local development only: stands in for the gateway's checkout page by sending the fake gateway's signed webhook. */
@RestController
@Profile("local")
@RequestMapping("/api/dev/payments")
public class DevPaymentController {
  private final PaymentService payments;
  private final FakePaymentGateway fake;
  private final OrderRepository orders;
  private final ObjectMapper json = new ObjectMapper();

  public DevPaymentController(PaymentService payments, FakePaymentGateway fake, OrderRepository orders) {
    this.payments = payments;
    this.fake = fake;
    this.orders = orders;
  }

  /** outcome is "success" or "failure". */
  @PostMapping("/{gatewayOrderId}/{outcome}")
  Map<String, Object> pay(@PathVariable String gatewayOrderId, @PathVariable String outcome) throws Exception {
    var order = orders.findByPayment_GatewayOrderId(gatewayOrderId).orElseThrow(() -> new IllegalArgumentException("Unknown payment"));
    String body = json.writeValueAsString(Map.of(
        "event", "success".equals(outcome) ? "payment.captured" : "payment.failed",
        "orderId", gatewayOrderId,
        "paymentId", "fake_pay_" + UUID.randomUUID().toString().replace("-", ""),
        "amount", order.total.toPlainString()));
    payments.handleWebhook("fake", body, Map.of(FakePaymentGateway.SIGNATURE_HEADER, fake.sign(body)));
    return Map.of("sent", outcome);
  }
}
