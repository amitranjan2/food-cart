package in.foodcart.service.whatsapp;

import in.foodcart.data.WhatsAppMessageEntity;
import in.foodcart.data.WhatsAppMessageEntity.Status;
import in.foodcart.data.WhatsAppMessageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.*;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class WhatsAppDeliveryTest {
  // 2026-10-17 10:00 India time.
  private static final Instant NOW = Instant.parse("2026-10-17T04:30:00Z");
  private final Map<String, WhatsAppMessageEntity> store = new HashMap<>();
  private WhatsAppMessageRepository repo;
  private WhatsAppDelivery delivery;

  @BeforeEach
  void setUp() {
    repo = mock(WhatsAppMessageRepository.class);
    when(repo.save(any())).thenAnswer(call -> {
      WhatsAppMessageEntity m = call.getArgument(0);
      store.put(m.id, m);
      return m;
    });
    when(repo.findById(any())).thenAnswer(call -> Optional.ofNullable(store.get(call.<String>getArgument(0))));
    when(repo.findBySentAtAfter(any())).thenAnswer(call -> store.values().stream().filter(m -> m.sentAt.isAfter(call.getArgument(0))).toList());
    delivery = new WhatsAppDelivery(repo, Clock.fixed(NOW, ZoneOffset.UTC));
  }

  @Test
  void recordsASentMessageForThirtyDays() {
    delivery.sent("wamid.1", "9876543210", "OTP");
    WhatsAppMessageEntity m = store.get("wamid.1");
    assertEquals(Status.ACCEPTED, m.status);
    assertEquals("9876543210", m.mobile);
    assertEquals(NOW.plus(Duration.ofDays(30)), m.purgeAt);
  }

  @Test
  void trackingNeverBreaksTheSend() {
    doThrow(new RuntimeException("db down")).when(repo).save(any());
    assertDoesNotThrow(() -> delivery.sent("wamid.1", "9876543210", "OTP"));
    assertDoesNotThrow(() -> delivery.sent(null, "9876543210", "OTP"));
  }

  @Test
  void statusesOnlyMoveForwardEvenOutOfOrder() {
    delivery.sent("wamid.1", "9876543210", "OTP");
    Instant t = NOW.plusSeconds(5);
    assertTrue(delivery.status("wamid.1", "read", t.plusSeconds(10), null, null));
    assertTrue(delivery.status("wamid.1", "delivered", t, null, null));
    assertTrue(delivery.status("wamid.1", "sent", t.minusSeconds(2), null, null));
    WhatsAppMessageEntity m = store.get("wamid.1");
    assertEquals(Status.READ, m.status, "a late 'delivered' or 'sent' doesn't undo 'read'");
    assertEquals(t.plusSeconds(10), m.readAt);
    assertEquals(t.plusSeconds(10), m.deliveredAt, "read implies delivered, set from the first webhook that proved it");
  }

  @Test
  void aFailureKeepsMetasReasonAndIsFinal() {
    delivery.sent("wamid.1", "9876543210", "OTP");
    delivery.status("wamid.1", "failed", NOW.plusSeconds(3), 131026, "Message undeliverable");
    delivery.status("wamid.1", "delivered", NOW.plusSeconds(4), null, null);
    WhatsAppMessageEntity m = store.get("wamid.1");
    assertEquals(Status.FAILED, m.status);
    assertEquals(131026, m.errorCode);
    assertEquals("Message undeliverable", m.errorTitle);
  }

  @Test
  void ignoresMessagesThatArentOursAndUnknownStatuses() {
    assertFalse(delivery.status("wamid.from-whatsapp-manager", "delivered", NOW, null, null));
    delivery.sent("wamid.1", "9876543210", "OTP");
    assertFalse(delivery.status("wamid.1", "deleted", NOW, null, null));
    assertEquals(Status.ACCEPTED, store.get("wamid.1").status);
  }

  @Test
  @SuppressWarnings("unchecked")
  void statsCountEachIndiaDayAndTheFailureReasons() {
    delivery.sent("a", "9000000001", "OTP");
    delivery.sent("b", "9000000002", "OTP");
    delivery.sent("c", "9000000003", "OTP");
    delivery.sent("d", "9000000004", "OTP");
    delivery.status("a", "delivered", NOW, null, null);
    delivery.status("b", "read", NOW, null, null);
    delivery.status("c", "failed", NOW, 131026, "Message undeliverable");
    // Yesterday, India time (23:50 on Oct 16 is 18:20 UTC).
    WhatsAppMessageEntity old = new WhatsAppMessageEntity();
    old.id = "e";
    old.sentAt = Instant.parse("2026-10-16T18:20:00Z");
    old.status = Status.DELIVERED;
    store.put("e", old);

    Map<String, Object> stats = delivery.stats(2);
    Map<String, Object> total = (Map<String, Object>) stats.get("total");
    assertEquals(5L, total.get("sent"));
    assertEquals(3L, total.get("delivered"), "delivered counts read ones too");
    assertEquals(1L, total.get("read"));
    assertEquals(1L, total.get("failed"));
    assertEquals(1L, total.get("pending"));
    assertEquals(60.0, total.get("deliveredPercent"));
    List<Map<String, Object>> days = (List<Map<String, Object>>) stats.get("byDay");
    assertEquals("2026-10-17", days.get(0).get("day"));
    assertEquals(4L, days.get(0).get("sent"));
    assertEquals("2026-10-16", days.get(1).get("day"));
    assertEquals(1L, days.get(1).get("sent"));
    assertEquals(Map.of("131026 Message undeliverable", 1L), stats.get("failures"));
  }

  @Test
  void anEmptyDayHasNoPercentage() {
    Map<String, Object> stats = delivery.stats(1);
    assertNull(((Map<?, ?>) stats.get("total")).get("deliveredPercent"));
  }
}
