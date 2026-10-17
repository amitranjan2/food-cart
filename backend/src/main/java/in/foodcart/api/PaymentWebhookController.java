package in.foodcart.api;

import in.foodcart.service.payments.PaymentService;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/** Gateways call this without a login; PaymentService trusts a webhook only after its gateway verifies the signature. */
@RestController
@RequestMapping("/api/payments/webhook")
public class PaymentWebhookController {
  private final PaymentService payments;

  public PaymentWebhookController(PaymentService payments) {
    this.payments = payments;
  }

  @PostMapping("/{gateway}")
  Map<String, Object> webhook(@PathVariable String gateway, @RequestBody String rawBody, @RequestHeader Map<String, String> headers) {
    Map<String, String> lower = new HashMap<>();
    headers.forEach((k, v) -> lower.put(k.toLowerCase(Locale.ROOT), v));
    payments.handleWebhook(gateway, rawBody, lower);
    return Map.of("ok", true);
  }
}
