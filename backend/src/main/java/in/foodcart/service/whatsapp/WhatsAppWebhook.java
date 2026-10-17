package in.foodcart.service.whatsapp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;

/**
 * Meta's WhatsApp webhook. Off until WHATSAPP_APP_SECRET (signs every POST) and WHATSAPP_WEBHOOK_VERIFY_TOKEN (our
 * answer to Meta's subscribe check) are set. Uses message statuses (WhatsAppDelivery) and incoming text messages that
 * carry a login code (WhatsAppLogin); every other customer message is left alone.
 */
@Service
public class WhatsAppWebhook {
  private static final Logger log = LoggerFactory.getLogger(WhatsAppWebhook.class);
  private final byte[] appSecret;
  private final byte[] verifyToken;
  private final WhatsAppDelivery delivery;
  private final WhatsAppLogin logins;
  private final WhatsAppText text;
  private final ObjectMapper json = new ObjectMapper();

  @Autowired
  public WhatsAppWebhook(@Value("${WHATSAPP_APP_SECRET:}") String appSecret, @Value("${WHATSAPP_WEBHOOK_VERIFY_TOKEN:}") String verifyToken,
      WhatsAppDelivery delivery, WhatsAppLogin logins, WhatsAppText text) {
    this.appSecret = appSecret.isBlank() ? null : appSecret.trim().getBytes(StandardCharsets.UTF_8);
    this.verifyToken = verifyToken.isBlank() ? null : verifyToken.trim().getBytes(StandardCharsets.UTF_8);
    this.delivery = delivery;
    this.logins = logins;
    this.text = text;
  }

  /** Statuses only (no logins, no replies). */
  public WhatsAppWebhook(String appSecret, String verifyToken, WhatsAppDelivery delivery) {
    this(appSecret, verifyToken, delivery, null, null);
  }

  public boolean enabled() {
    return appSecret != null && verifyToken != null;
  }

  /** Meta's GET check when the Callback URL is saved: echo the challenge only if the token is ours. */
  public String verify(String mode, String token, String challenge) {
    if (!enabled() || !"subscribe".equals(mode) || token == null || challenge == null) return null;
    return MessageDigest.isEqual(verifyToken, token.getBytes(StandardCharsets.UTF_8)) ? challenge : null;
  }

  /** "sha256=<hex>" over the raw body with the app secret, compared in constant time. */
  public boolean signed(byte[] rawBody, String signatureHeader) {
    if (!enabled() || rawBody == null || signatureHeader == null || !signatureHeader.startsWith("sha256=")) return false;
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(appSecret, "HmacSHA256"));
      byte[] expected = mac.doFinal(rawBody);
      byte[] given = HexFormat.of().parseHex(signatureHeader.substring(7).trim());
      return MessageDigest.isEqual(expected, given);
    } catch (IllegalArgumentException badHex) {
      return false;
    } catch (Exception e) {
      throw new IllegalStateException("HMAC unavailable", e);
    }
  }

  /** Applies every status in a signed payload; returns how many matched our messages. Bad shapes are skipped. */
  public int handle(String rawBody) {
    JsonNode root;
    try {
      root = json.readTree(rawBody);
    } catch (Exception e) {
      log.warn("WhatsApp webhook: unreadable body");
      return 0;
    }
    int matched = 0;
    for (JsonNode entry : root.path("entry")) {
      for (JsonNode change : entry.path("changes")) {
        for (JsonNode s : change.path("value").path("statuses")) {
          JsonNode error = s.path("errors").path(0);
          Integer code = error.hasNonNull("code") ? error.path("code").asInt() : null;
          String title = error.hasNonNull("title") ? error.path("title").asText() : null;
          Instant at = s.hasNonNull("timestamp") ? Instant.ofEpochSecond(s.path("timestamp").asLong()) : null;
          if (delivery.status(s.path("id").asText(null), s.path("status").asText(null), at, code, title)) matched++;
        }
        if (logins == null) continue;
        for (JsonNode m : change.path("value").path("messages")) {
          if (!"text".equals(m.path("type").asText())) continue;
          String from = m.path("from").asText(null);
          String reply = logins.inbound(from, m.path("text").path("body").asText(null), m.path("id").asText(null));
          if (reply != null && text != null) text.reply(from, reply);
        }
      }
    }
    return matched;
  }
}
