package in.foodcart.service.whatsapp;

import in.foodcart.data.WaLoginEntity;
import in.foodcart.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

import java.time.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Mongo is a small in-memory stand-in here; the atomic claim is checked live against Mongo too (tracker N3). */
class WhatsAppLoginTest {
  private final Map<String, WaLoginEntity> byId = new HashMap<>();
  private final MongoTemplate mongo = mock(MongoTemplate.class);
  private final AuthService auth = mock(AuthService.class);
  private final AtomicReference<Instant> now = new AtomicReference<>(Instant.parse("2026-10-17T06:00:00Z"));
  private WhatsAppLogin login;

  @BeforeEach
  void setUp() {
    when(mongo.insert(any(WaLoginEntity.class))).thenAnswer(call -> {
      WaLoginEntity e = call.getArgument(0);
      WaLoginEntity copy = copy(e);
      byId.put(copy.id, copy);
      return e;
    });
    when(mongo.findById(any(), eq(WaLoginEntity.class))).thenAnswer(call -> byId.get(call.<String>getArgument(0)));
    when(mongo.findOne(any(Query.class), eq(WaLoginEntity.class))).thenAnswer(call -> {
      String code = (String) call.<Query>getArgument(0).getQueryObject().get("code");
      return byId.values().stream().filter(e -> e.code.equals(code)).findFirst().orElse(null);
    });
    // updateFirst: apply the $set/$unset to the one matching document (only when verifiedAt is still null).
    when(mongo.updateFirst(any(Query.class), any(Update.class), eq(WaLoginEntity.class))).thenAnswer(call -> {
      WaLoginEntity e = byId.get((String) call.<Query>getArgument(0).getQueryObject().get("_id"));
      if (e != null && e.verifiedAt == null) apply(e, call.getArgument(1));
      return null;
    });
    // findAndModify: the claim succeeds once, only for a verified, unconsumed login.
    when(mongo.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(WaLoginEntity.class))).thenAnswer(call -> {
      WaLoginEntity e = byId.get((String) call.<Query>getArgument(0).getQueryObject().get("_id"));
      if (e == null || e.verifiedAt == null || e.consumedAt != null) return null;
      e.consumedAt = now.get();
      return e;
    });
    when(auth.customerSignedIn("9876543210")).thenReturn("customer-session");
    when(auth.vendorSignedIn("9876543210")).thenReturn("vendor-session");
    login = new WhatsAppLogin(mongo, auth, "+91 92057 60890", true, clockAt());
  }

  private Clock clockAt() {
    Clock clock = mock(Clock.class);
    when(clock.instant()).thenAnswer(call -> now.get());
    return clock;
  }

  private static WaLoginEntity copy(WaLoginEntity e) {
    WaLoginEntity c = new WaLoginEntity();
    c.id = e.id; c.code = e.code; c.role = e.role; c.mobile = e.mobile; c.createdAt = e.createdAt; c.expiresAt = e.expiresAt; c.purgeAt = e.purgeAt;
    return c;
  }

  @SuppressWarnings("unchecked")
  private void apply(WaLoginEntity e, Update u) {
    Map<String, Object> set = (Map<String, Object>) u.getUpdateObject().getOrDefault("$set", Map.of());
    Map<String, Object> unset = (Map<String, Object>) u.getUpdateObject().getOrDefault("$unset", Map.of());
    if (set.containsKey("verifiedAt")) e.verifiedAt = (Instant) set.get("verifiedAt");
    if (set.containsKey("wrongNumberAt")) e.wrongNumberAt = (Instant) set.get("wrongNumberAt");
    if (set.containsKey("messageId")) e.messageId = (String) set.get("messageId");
    if (unset.containsKey("wrongNumberAt")) e.wrongNumberAt = null;
  }

  private Map<String, Object> start() {
    return login.start("customer", "9876543210");
  }

  @Test
  void startGivesACodeALinkToOurNumberAndAQrCode() {
    Map<String, Object> s = start();
    String code = (String) s.get("code");
    assertTrue(code.matches("SM-[" + WhatsAppLogin.ALPHABET + "]{6}"), code);
    assertEquals("+91 92057 60890", s.get("number"));
    assertEquals("https://wa.me/919205760890?text=Login%20" + code, s.get("link"));
    assertTrue(((String) s.get("secret")).length() >= 22);
    assertTrue(((String) s.get("qrSvg")).startsWith("<svg"));
  }

  @Test
  void offWithoutOurNumberOrWebhook() {
    assertFalse(new WhatsAppLogin(mongo, auth, "", true, clockAt()).enabled());
    assertFalse(new WhatsAppLogin(mongo, auth, "919205760890", false, clockAt()).enabled());
    assertThrows(IllegalStateException.class, () -> new WhatsAppLogin(mongo, auth, "", true, clockAt()).start("customer", "9876543210"));
  }

  @Test
  void refusesBadNumbersAndRoles() {
    assertThrows(IllegalArgumentException.class, () -> login.start("customer", "12345"));
    assertThrows(IllegalArgumentException.class, () -> login.start("admin", "9876543210"));
  }

  @Test
  void theRightSenderSignsInTheBrowserExactlyOnce() {
    Map<String, Object> s = start();
    String secret = (String) s.get("secret");
    assertEquals(WhatsAppLogin.State.WAITING, login.poll(secret).get("state"));

    assertEquals(WhatsAppLogin.SIGNED_IN, login.inbound("919876543210", "Login " + s.get("code"), "wamid.in1"));
    Map<String, Object> done = login.poll(secret);
    assertEquals(WhatsAppLogin.State.SIGNED_IN, done.get("state"));
    assertEquals("customer-session", done.get("token"));
    assertEquals("customer", done.get("role"));

    assertEquals(Map.of("state", WhatsAppLogin.State.EXPIRED), login.poll(secret), "the session is handed out once");
    verify(auth, times(1)).customerSignedIn("9876543210");
  }

  @Test
  void vendorLoginsGetAVendorSession() {
    Map<String, Object> s = login.start("vendor", "9876543210");
    login.inbound("919876543210", "login " + ((String) s.get("code")).toLowerCase(), "wamid.in1");
    Map<String, Object> done = login.poll((String) s.get("secret"));
    assertEquals("vendor-session", done.get("token"));
    assertEquals("vendor", done.get("role"));
  }

  @Test
  void aDifferentSenderCannotSignIn() {
    Map<String, Object> s = start();
    assertEquals(WhatsAppLogin.WRONG_NUMBER, login.inbound("919811112222", "Login " + s.get("code"), "wamid.in1"));
    assertEquals(WhatsAppLogin.State.WRONG_NUMBER, login.poll((String) s.get("secret")).get("state"));
    verifyNoInteractions(auth);
    // The right phone can still finish afterwards.
    assertEquals(WhatsAppLogin.SIGNED_IN, login.inbound("919876543210", "Login " + s.get("code"), "wamid.in2"));
    assertEquals(WhatsAppLogin.State.SIGNED_IN, login.poll((String) s.get("secret")).get("state"));
  }

  @Test
  void foreignNumbersNeverMatch() {
    Map<String, Object> s = start();
    // Same last 10 digits, other country code.
    assertEquals(WhatsAppLogin.WRONG_NUMBER, login.inbound("19876543210", "Login " + s.get("code"), "wamid.in1"));
  }

  @Test
  void expiredCodesAreRefused() {
    Map<String, Object> s = start();
    now.set(now.get().plus(WhatsAppLogin.LIFETIME).plusSeconds(1));
    assertEquals(WhatsAppLogin.EXPIRED, login.inbound("919876543210", "Login " + s.get("code"), "wamid.in1"));
    assertEquals(WhatsAppLogin.State.EXPIRED, login.poll((String) s.get("secret")).get("state"));
  }

  @Test
  void ordinaryMessagesAndUnknownSecretsAreLeftAlone() {
    assertNull(login.inbound("919876543210", "Is the stall open today?", "wamid.in1"));
    assertEquals(WhatsAppLogin.EXPIRED, login.inbound("919876543210", "Login SM-ACDEFG", "wamid.in2"), "a code we never made");
    assertEquals(Map.of("state", WhatsAppLogin.State.EXPIRED), login.poll("not-a-real-secret-123"));
    assertEquals(Map.of("state", WhatsAppLogin.State.EXPIRED), login.poll(null));
  }

  @Test
  void aRetriedWebhookDoesNotReplyTwice() {
    Map<String, Object> s = start();
    assertEquals(WhatsAppLogin.SIGNED_IN, login.inbound("919876543210", "Login " + s.get("code"), "wamid.in1"));
    assertNull(login.inbound("919876543210", "Login " + s.get("code"), "wamid.in1"));
  }
}
