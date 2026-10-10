package in.foodcart.service.otp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.BufferingClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Sends login codes as a WhatsApp Authentication template through Meta's WhatsApp Cloud API. Created by
 * WhatsAppOtpConfig when WHATSAPP_TOKEN is set outside the local profile.
 */
public class WhatsAppOtpSender implements OtpSender {
  private static final Logger log = LoggerFactory.getLogger(WhatsAppOtpSender.class);
  static final String FAILED = "Couldn't send the code on WhatsApp. Try again.";

  /** Everything that comes from the environment; see the README. */
  public record Settings(String token, String phoneNumberId, String template, String language, String apiVersion) {}

  private final Settings settings;
  private final RestClient http;
  private final ObjectMapper json = new ObjectMapper();

  public WhatsAppOtpSender(Settings settings, String baseUrl, Duration timeout) {
    this.settings = settings;
    SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
    factory.setConnectTimeout(timeout);
    factory.setReadTimeout(timeout);
    // Buffered so the request carries a Content-Length instead of being streamed in chunks.
    this.http = RestClient.builder().baseUrl(baseUrl).requestFactory(new BufferingClientHttpRequestFactory(factory)).build();
  }

  @Override
  public void send(String mobile, String code) {
    try {
      http.post()
          .uri("/{version}/{phoneNumberId}/messages", settings.apiVersion(), settings.phoneNumberId())
          .header("Authorization", "Bearer " + settings.token())
          .contentType(MediaType.APPLICATION_JSON)
          .body(message(mobile, code))
          .retrieve()
          .toBodilessEntity();
    } catch (RestClientResponseException e) {
      // Meta's error code says what went wrong (bad token, template not approved, …). Never log the token or the code.
      log.warn("WhatsApp send failed: HTTP {} Meta error {}", e.getStatusCode().value(), metaError(e.getResponseBodyAsString()));
      throw new IllegalStateException(FAILED);
    } catch (RestClientException e) {
      log.warn("WhatsApp send failed: {}", e.getClass().getSimpleName());
      throw new IllegalStateException(FAILED);
    }
  }

  /**
   * The Authentication template request. The code goes in the body and in the "Copy code" button, which Meta requires.
   * Mobile numbers are stored as 10 Indian digits (AuthService checks this), so the country code is always 91.
   */
  Map<String, Object> message(String mobile, String code) {
    List<Map<String, Object>> codeOnly = List.of(Map.of("type", "text", "text", code));
    return Map.of(
        "messaging_product", "whatsapp",
        "to", "91" + mobile,
        "type", "template",
        "template", Map.of(
            "name", settings.template(),
            "language", Map.of("code", settings.language()),
            "components", List.of(
                Map.of("type", "body", "parameters", codeOnly),
                Map.of("type", "button", "sub_type", "url", "index", "0", "parameters", codeOnly))));
  }

  private String metaError(String body) {
    try {
      JsonNode error = json.readTree(body).path("error");
      return error.path("code").asText("?") + (error.has("error_subcode") ? "/" + error.path("error_subcode").asText() : "");
    } catch (Exception unreadable) {
      return "?";
    }
  }
}
