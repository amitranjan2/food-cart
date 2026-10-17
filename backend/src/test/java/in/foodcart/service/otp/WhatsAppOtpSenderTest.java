package in.foodcart.service.otp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

/** Talks to a local stand-in for Meta's API; no real WhatsApp calls. */
class WhatsAppOtpSenderTest {
  private HttpServer meta;
  private final AtomicReference<String> path = new AtomicReference<>();
  private final AtomicReference<String> auth = new AtomicReference<>();
  private final AtomicReference<String> body = new AtomicReference<>();
  private final AtomicReference<String> length = new AtomicReference<>();
  private volatile int status = 200;
  private volatile String reply = "{\"messages\":[{\"id\":\"wamid.1\"}]}";
  private volatile long delayMs = 0;

  @BeforeEach
  void start() throws IOException {
    meta = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    meta.createContext("/", exchange -> {
      path.set(exchange.getRequestURI().getPath());
      auth.set(exchange.getRequestHeaders().getFirst("Authorization"));
      length.set(exchange.getRequestHeaders().getFirst("Content-Length"));
      body.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
      try {
        Thread.sleep(delayMs);
      } catch (InterruptedException ignored) {
        Thread.currentThread().interrupt();
      }
      byte[] out = reply.getBytes(StandardCharsets.UTF_8);
      exchange.sendResponseHeaders(status, out.length);
      exchange.getResponseBody().write(out);
      exchange.close();
    });
    meta.start();
  }

  @AfterEach
  void stop() {
    meta.stop(0);
  }

  private WhatsAppOtpSender sender(Duration timeout) {
    return new WhatsAppOtpSender(
        new WhatsAppOtpSender.Settings("test-token", "1234567890", "foodcart_otp", "en_US", "v21.0"),
        "http://127.0.0.1:" + meta.getAddress().getPort(), timeout);
  }

  @Test
  void sendsTheAuthenticationTemplateWithTheCodeInBodyAndButton() throws Exception {
    sender(Duration.ofSeconds(2)).send("9876543210", "482913");
    assertEquals("/v21.0/1234567890/messages", path.get());
    assertEquals("Bearer test-token", auth.get());
    assertEquals(String.valueOf(body.get().getBytes(StandardCharsets.UTF_8).length), length.get(), "sent with a Content-Length, not chunked");
    JsonNode sent = new ObjectMapper().readTree(body.get());
    assertEquals("whatsapp", sent.path("messaging_product").asText());
    assertEquals("919876543210", sent.path("to").asText());
    assertEquals("template", sent.path("type").asText());
    assertEquals("foodcart_otp", sent.path("template").path("name").asText());
    assertEquals("en_US", sent.path("template").path("language").path("code").asText());
    JsonNode components = sent.path("template").path("components");
    assertEquals("body", components.get(0).path("type").asText());
    assertEquals("482913", components.get(0).path("parameters").get(0).path("text").asText());
    assertEquals("button", components.get(1).path("type").asText());
    assertEquals("url", components.get(1).path("sub_type").asText());
    assertEquals("0", components.get(1).path("index").asText());
    assertEquals("482913", components.get(1).path("parameters").get(0).path("text").asText());
  }

  @Test
  void anErrorFromMetaBecomesAClearMessage() {
    status = 400;
    reply = "{\"error\":{\"message\":\"Template name does not exist\",\"code\":132001,\"error_subcode\":2494073}}";
    IllegalStateException e = assertThrows(IllegalStateException.class, () -> sender(Duration.ofSeconds(2)).send("9876543210", "482913"));
    assertEquals(WhatsAppOtpSender.FAILED, e.getMessage());
  }

  @Test
  void aSlowMetaTimesOutInsteadOfHangingTheLogin() {
    delayMs = 1500;
    IllegalStateException e = assertThrows(IllegalStateException.class, () -> sender(Duration.ofMillis(300)).send("9876543210", "482913"));
    assertEquals(WhatsAppOtpSender.FAILED, e.getMessage());
  }

  @Test
  void anUnreachableMetaIsAFailedSend() {
    WhatsAppOtpSender nowhere = new WhatsAppOtpSender(
        new WhatsAppOtpSender.Settings("t", "1", "foodcart_otp", "en", "v21.0"), "http://127.0.0.1:1", Duration.ofMillis(300));
    assertThrows(IllegalStateException.class, () -> nowhere.send("9876543210", "482913"));
  }

  @Test
  void configRefusesToStartWithMissingSettings() {
    IllegalStateException e = assertThrows(IllegalStateException.class,
        () -> new WhatsAppOtpConfig().whatsAppOtpSender("token", "", "foodcart_otp", " ", "v21.0", "https://graph.facebook.com", false, env("local"), null));
    assertEquals("WHATSAPP_TOKEN is set but these are missing: WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_OTP_LANGUAGE", e.getMessage());
  }

  private static org.springframework.mock.env.MockEnvironment env(String profile) {
    org.springframework.mock.env.MockEnvironment env = new org.springframework.mock.env.MockEnvironment();
    env.setActiveProfiles(profile);
    return env;
  }

  @Test
  void testModeSendsTheSampleTemplateAndKeepsALocalCode() throws Exception {
    WhatsAppOtpSender test = new WhatsAppOtpSender(
        new WhatsAppOtpSender.Settings("test-token", "1234567890", "", "", "v21.0", true), "http://127.0.0.1:" + meta.getAddress().getPort(), Duration.ofSeconds(2));
    assertEquals("123456", test.fixedCode(), "the sample template carries no code, so the code is fixed");
    test.send("9876543210", "123456");
    JsonNode sent = new ObjectMapper().readTree(body.get());
    assertEquals("hello_world", sent.path("template").path("name").asText());
    assertEquals("en_US", sent.path("template").path("language").path("code").asText());
    assertTrue(sent.path("template").path("components").isMissingNode(), "no parameters on the sample template");
    assertFalse(body.get().contains("123456"), "the code is never sent in test mode");
    assertNull(sender(Duration.ofSeconds(2)).fixedCode(), "the real sender still generates random codes");
  }

  @Test
  void testModeNeedsNoTemplateButOnlyRunsLocally() {
    OtpSender ok = new WhatsAppOtpConfig().whatsAppOtpSender("token", "1", "", "", "v21.0", "https://graph.facebook.com", true, env("local"), null);
    assertEquals("123456", ok.fixedCode());
    IllegalStateException e = assertThrows(IllegalStateException.class,
        () -> new WhatsAppOtpConfig().whatsAppOtpSender("token", "1", "", "", "v21.0", "https://graph.facebook.com", true, env("prod"), null));
    assertTrue(e.getMessage().contains("local testing only"));
  }

  @Test
  void recordsMetasMessageIdForDeliveryTracking() {
    reply = "{\"messaging_product\":\"whatsapp\",\"messages\":[{\"id\":\"wamid.HBgM\"}]}";
    java.util.List<String> seen = new java.util.ArrayList<>();
    new WhatsAppOtpSender(new WhatsAppOtpSender.Settings("test-token", "1234567890", "foodcart_otp", "en_US", "v21.0"),
        "http://127.0.0.1:" + meta.getAddress().getPort(), Duration.ofSeconds(2), (id, mobile, purpose) -> seen.add(id + " " + mobile + " " + purpose))
        .send("9876543210", "482913");
    assertEquals(java.util.List.of("wamid.HBgM 9876543210 OTP"), seen);
  }

  @Test
  void aTrackingFailureDoesNotFailTheLogin() {
    assertDoesNotThrow(() -> new WhatsAppOtpSender(new WhatsAppOtpSender.Settings("test-token", "1234567890", "foodcart_otp", "en_US", "v21.0"),
        "http://127.0.0.1:" + meta.getAddress().getPort(), Duration.ofSeconds(2), (id, mobile, purpose) -> { throw new RuntimeException("db down"); })
        .send("9876543210", "482913"));
  }

  @Test
  void withoutATemplateCodesAreOffAndPointToWhatsAppLogin() {
    OtpSender off = new WhatsAppOtpConfig().whatsAppOtpSender("token", "1", "", "", "v26.0", "https://graph.facebook.com", false, env("prod"), null);
    assertFalse(off.available());
    IllegalStateException e = assertThrows(IllegalStateException.class, () -> off.send("9876543210", "123456"));
    assertEquals(UnavailableOtpSender.USE_WHATSAPP, e.getMessage());
  }
}
