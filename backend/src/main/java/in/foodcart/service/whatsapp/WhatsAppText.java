package in.foodcart.service.whatsapp;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.BufferingClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;
import java.util.Map;

/**
 * Free-text replies inside the 24-hour window that opens when a customer messages us (no template needed). Used to
 * confirm a WhatsApp login. Best effort: a failed reply is logged and never fails the login.
 */
@Service
public class WhatsAppText {
  private static final Logger log = LoggerFactory.getLogger(WhatsAppText.class);
  private final String token, phoneNumberId, apiVersion;
  private final RestClient http;

  public WhatsAppText(@Value("${WHATSAPP_TOKEN:}") String token, @Value("${WHATSAPP_PHONE_NUMBER_ID:}") String phoneNumberId,
      @Value("${WHATSAPP_API_VERSION:}") String apiVersion, @Value("${WHATSAPP_API_BASE:https://graph.facebook.com}") String apiBase) {
    this.token = token.trim();
    this.phoneNumberId = phoneNumberId.trim();
    this.apiVersion = apiVersion.trim();
    SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
    factory.setConnectTimeout(Duration.ofSeconds(5));
    factory.setReadTimeout(Duration.ofSeconds(5));
    this.http = RestClient.builder().baseUrl(apiBase.trim()).requestFactory(new BufferingClientHttpRequestFactory(factory)).build();
  }

  public boolean enabled() {
    return !token.isEmpty() && !phoneNumberId.isEmpty() && !apiVersion.isEmpty();
  }

  /** `to` is WhatsApp's id for the sender, e.g. "919876543210", exactly as the webhook gave it. */
  public void reply(String to, String body) {
    if (!enabled() || to == null || body == null) return;
    try {
      http.post()
          .uri("/{version}/{phoneNumberId}/messages", apiVersion, phoneNumberId)
          .header("Authorization", "Bearer " + token)
          .contentType(MediaType.APPLICATION_JSON)
          .body(Map.of("messaging_product", "whatsapp", "to", to, "type", "text", "text", Map.of("body", body)))
          .retrieve()
          .toBodilessEntity();
    } catch (RestClientResponseException e) {
      log.warn("WhatsApp reply failed: HTTP {}", e.getStatusCode().value());
    } catch (RuntimeException e) {
      log.warn("WhatsApp reply failed: {}", e.getClass().getSimpleName());
    }
  }
}
