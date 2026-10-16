package in.foodcart.service.whatsapp;

import org.junit.jupiter.api.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HexFormat;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class WhatsAppWebhookTest {
  private static final String SECRET = "app-secret-123";
  private final WhatsAppDelivery delivery = mock(WhatsAppDelivery.class);
  private final WhatsAppWebhook webhook = new WhatsAppWebhook(SECRET, "verify-me", delivery);

  private static String sign(byte[] body, String secret) throws Exception {
    Mac mac = Mac.getInstance("HmacSHA256");
    mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
    return "sha256=" + HexFormat.of().formatHex(mac.doFinal(body));
  }

  @Test
  void offUntilBothSecretsAreSet() {
    WhatsAppWebhook off = new WhatsAppWebhook("", "verify-me", delivery);
    assertFalse(off.enabled());
    assertNull(off.verify("subscribe", "verify-me", "123"));
    assertFalse(off.signed("{}".getBytes(StandardCharsets.UTF_8), "sha256=00"));
    assertFalse(new WhatsAppWebhook(SECRET, " ", delivery).enabled());
  }

  @Test
  void answersMetasCheckOnlyWithTheRightToken() {
    assertEquals("1158201444", webhook.verify("subscribe", "verify-me", "1158201444"));
    assertNull(webhook.verify("subscribe", "wrong", "1158201444"));
    assertNull(webhook.verify("unsubscribe", "verify-me", "1158201444"));
    assertNull(webhook.verify("subscribe", null, "1158201444"));
  }

  @Test
  void acceptsOnlyBodiesSignedWithOurAppSecret() throws Exception {
    byte[] body = "{\"entry\":[]}".getBytes(StandardCharsets.UTF_8);
    assertTrue(webhook.signed(body, sign(body, SECRET)));
    assertFalse(webhook.signed(body, sign(body, "someone-else")), "signed with another secret");
    assertFalse(webhook.signed("{\"entry\":[1]}".getBytes(StandardCharsets.UTF_8), sign(body, SECRET)), "body changed after signing");
    assertFalse(webhook.signed(body, null));
    assertFalse(webhook.signed(body, "md5=abc"));
    assertFalse(webhook.signed(body, "sha256=not-hex"));
  }

  @Test
  void appliesEveryStatusInMetasPayload() {
    when(delivery.status(eq("wamid.A"), any(), any(), any(), any())).thenReturn(true);
    String payload = """
        {"object":"whatsapp_business_account","entry":[{"id":"2100140443936442","changes":[{"field":"messages","value":{
          "messaging_product":"whatsapp","metadata":{"phone_number_id":"1374337695763992"},
          "statuses":[
            {"id":"wamid.A","status":"delivered","timestamp":"1792200000","recipient_id":"919876543210"},
            {"id":"wamid.B","status":"failed","timestamp":"1792200005","recipient_id":"919800000000",
             "errors":[{"code":131026,"title":"Message undeliverable"}]}
          ]}}]}]}
        """;
    assertEquals(1, webhook.handle(payload), "only wamid.A is one of ours");
    verify(delivery).status("wamid.A", "delivered", Instant.ofEpochSecond(1792200000L), null, null);
    verify(delivery).status("wamid.B", "failed", Instant.ofEpochSecond(1792200005L), 131026, "Message undeliverable");
  }

  @Test
  void incomingMessagesAndJunkAreIgnored() {
    assertEquals(0, webhook.handle("{\"entry\":[{\"changes\":[{\"value\":{\"messages\":[{\"from\":\"91…\",\"text\":{\"body\":\"hi\"}}]}}]}]}"));
    assertEquals(0, webhook.handle("not json"));
    verifyNoInteractions(delivery);
  }
}
