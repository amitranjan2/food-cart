package in.foodcart.service.otp;

import in.foodcart.data.OtpChallengeEntity;
import in.foodcart.data.OtpChallengeRepository;
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

class OtpDeliveryTest {
  private static final Instant SENT = Instant.parse("2026-10-17T05:00:00Z");
  private static final String REF = "kQ3v8xZr1mN0pL2sT4uW6y";
  private final OtpChallengeRepository challenges = mock(OtpChallengeRepository.class);
  private final WhatsAppMessageRepository messages = mock(WhatsAppMessageRepository.class);
  private final List<WhatsAppMessageEntity> sent = new ArrayList<>();
  private OtpDelivery delivery;

  @BeforeEach
  void setUp() {
    OtpChallengeEntity c = new OtpChallengeEntity();
    c.id = "CUSTOMER:9876543210";
    c.lastSentAt = SENT;
    c.deliveryRef = REF;
    when(challenges.findByDeliveryRef(any())).thenAnswer(call -> REF.equals(call.getArgument(0)) ? Optional.of(c) : Optional.empty());
    when(messages.findTop10ByMobileOrderBySentAtDesc("9876543210")).thenAnswer(call ->
        sent.stream().sorted(Comparator.comparing((WhatsAppMessageEntity m) -> m.sentAt).reversed()).toList());
    delivery = at(SENT.plusSeconds(4));
  }

  private OtpDelivery at(Instant now) {
    return new OtpDelivery(challenges, messages, Clock.fixed(now, ZoneOffset.UTC));
  }

  private WhatsAppMessageEntity message(Instant at, Status status, Integer error) {
    WhatsAppMessageEntity m = new WhatsAppMessageEntity();
    m.sentAt = at;
    m.status = status;
    m.errorCode = error;
    sent.add(m);
    return m;
  }

  @Test
  void waitingUntilMetaSaysSomething() {
    assertEquals(OtpDelivery.State.WAITING, delivery.status(REF).get("state"));
    message(SENT.plusMillis(300), Status.ACCEPTED, null);
    assertEquals(OtpDelivery.State.WAITING, delivery.status(REF).get("state"));
  }

  @Test
  void deliveredOrReadBothSayDeliveredAndNeverRead() {
    WhatsAppMessageEntity m = message(SENT.plusMillis(300), Status.DELIVERED, null);
    assertEquals(Map.of("state", OtpDelivery.State.DELIVERED), delivery.status(REF));
    m.status = Status.READ;
    assertEquals(Map.of("state", OtpDelivery.State.DELIVERED), delivery.status(REF), "the cart never learns 'read'");
  }

  @Test
  void notOnWhatsAppAsksToCheckTheNumber() {
    message(SENT.plusMillis(300), Status.FAILED, 131026);
    Map<String, Object> out = delivery.status(REF);
    assertEquals(OtpDelivery.State.FAILED, out.get("state"));
    assertEquals(OtpDelivery.CHECK_NUMBER, out.get("message"));
  }

  @Test
  void otherFailuresSayTryAgainWithoutMetasCode() {
    message(SENT.plusMillis(300), Status.FAILED, 131049);
    Map<String, Object> out = delivery.status(REF);
    assertEquals(OtpDelivery.TRY_AGAIN, out.get("message"));
    assertFalse(out.toString().contains("131049"));
  }

  @Test
  void anOlderFailedCodeDoesNotSpoilTheNewOne() {
    message(SENT.minusSeconds(60), Status.FAILED, 131026);
    assertEquals(OtpDelivery.State.WAITING, delivery.status(REF).get("state"));
  }

  @Test
  void unknownOrStaleReferencesRevealNothing() {
    message(SENT.plusMillis(300), Status.FAILED, 131026);
    assertEquals(Map.of("state", OtpDelivery.State.WAITING), delivery.status("guessed-reference-0000"));
    assertEquals(Map.of("state", OtpDelivery.State.WAITING), delivery.status("short"));
    assertEquals(Map.of("state", OtpDelivery.State.WAITING), delivery.status(null));
    assertEquals(Map.of("state", OtpDelivery.State.WAITING), at(SENT.plus(Duration.ofMinutes(11))).status(REF), "only askable for 10 minutes");
  }
}
