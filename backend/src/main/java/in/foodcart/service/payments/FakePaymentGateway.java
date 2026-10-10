package in.foodcart.service.payments;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import in.foodcart.data.PaymentInfo;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;

/**
 * Local development only: no money moves. Webhooks are signed with a per-run secret and go through the same
 * signature check a real gateway's would, so the whole payment flow can be tested without keys.
 */
@Component
@Profile("local")
@ConditionalOnProperty(name = "app.payments.gateway", havingValue = "fake", matchIfMissing = true)
public class FakePaymentGateway implements PaymentGateway {
  public static final String SIGNATURE_HEADER = "x-fake-signature";

  private final ObjectMapper json = new ObjectMapper();
  private final byte[] secret = new byte[32];

  public FakePaymentGateway() {
    new SecureRandom().nextBytes(secret);
  }

  @Override
  public String name() {
    return "fake";
  }

  @Override
  public Checkout create(String orderId, BigDecimal amount, String customerName, String customerMobile) {
    return new Checkout("fake_order_" + UUID.randomUUID().toString().replace("-", ""), Map.of("amount", amount));
  }

  @Override
  public Event parseWebhook(String rawBody, Map<String, String> headers) {
    String given = headers.getOrDefault(SIGNATURE_HEADER, "");
    if (!MessageDigest.isEqual(sign(rawBody).getBytes(StandardCharsets.UTF_8), given.getBytes(StandardCharsets.UTF_8))) {
      throw new SecurityException("Invalid webhook signature");
    }
    try {
      JsonNode body = json.readTree(rawBody);
      EventType type = switch (body.path("event").asText()) {
        case "payment.captured" -> EventType.PAYMENT_CAPTURED;
        case "payment.failed" -> EventType.PAYMENT_FAILED;
        default -> EventType.IGNORED;
      };
      return new Event(type, body.path("orderId").asText(), body.path("paymentId").asText(), new BigDecimal(body.path("amount").asText("0")));
    } catch (Exception e) {
      throw new IllegalArgumentException("Unreadable webhook");
    }
  }

  @Override
  public Refund refund(PaymentInfo payment, BigDecimal amount) {
    return new Refund("fake_refund_" + UUID.randomUUID().toString().replace("-", ""), true);
  }

  /** HMAC-SHA256 of the raw body, as real gateways do. Used by the dev "pay" endpoint to produce a genuine webhook. */
  public String sign(String rawBody) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(secret, "HmacSHA256"));
      return HexFormat.of().formatHex(mac.doFinal(rawBody.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }
}
