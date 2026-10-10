package in.foodcart.service.otp;

import in.foodcart.data.OtpChallengeEntity;
import in.foodcart.data.OtpChallengeRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class OtpServiceTest {
  private final OtpChallengeRepository challenges = mock(OtpChallengeRepository.class);
  private final OtpSender sender = mock(OtpSender.class);
  /** 23:30 India time on Oct 10; counters are kept in a map. */
  private Instant now = Instant.parse("2026-10-10T18:00:00Z");
  private final Map<String, Long> counts = new HashMap<>();
  private final OtpCounters counters = mock(OtpCounters.class);

  {
    when(counters.count(any())).thenAnswer(call -> counts.getOrDefault(call.<String>getArgument(0), 0L));
    when(counters.add(any(), any())).thenAnswer(call -> counts.merge(call.getArgument(0), 1L, Long::sum));
  }

  private OtpService service(OtpSender active) {
    return service(active, new OtpLimits(1000, 15));
  }

  @SuppressWarnings("unchecked")
  private OtpService service(OtpSender active, OtpLimits limits) {
    ObjectProvider<OtpSender> provider = mock(ObjectProvider.class);
    when(provider.getIfAvailable()).thenReturn(active);
    Clock clock = mock(Clock.class);
    when(clock.instant()).thenAnswer(call -> now);
    return new OtpService(challenges, provider, counters, limits, clock);
  }

  /** Challenges kept in memory by id, like the repository would; returns the last one saved. */
  private OtpChallengeEntity[] storeChallenges() {
    OtpChallengeEntity[] saved = new OtpChallengeEntity[1];
    Map<String, OtpChallengeEntity> byId = new HashMap<>();
    when(challenges.findById(any())).thenAnswer(call -> Optional.ofNullable(byId.get(call.<String>getArgument(0))));
    when(challenges.save(any())).thenAnswer(call -> {
      OtpChallengeEntity c = call.getArgument(0);
      byId.put(c.id, c);
      return saved[0] = c;
    });
    return saved;
  }

  @Test
  void stopsSendingPastTheDailyCapAndStartsAgainTheNextIndiaDay() {
    storeChallenges();
    OtpService otp = service(sender, new OtpLimits(2, 15));
    otp.send("CUSTOMER", "9876543210");
    otp.send("VENDOR", "9876543211");
    IllegalStateException e = assertThrows(IllegalStateException.class, () -> otp.send("CUSTOMER", "9876543212"));
    assertEquals(OtpService.SENDS_PAUSED, e.getMessage());
    verify(sender, times(2)).send(any(), any());
    assertEquals(3L, counts.get("sends:2026-10-10"));

    now = Instant.parse("2026-10-10T18:31:00Z"); // 00:01 on Oct 11 in India
    otp.send("CUSTOMER", "9876543212");
    verify(sender, times(3)).send(any(), any());
  }

  @Test
  void refusedPerNumberRequestsDontUseTheDailyAllowance() {
    storeChallenges();
    OtpService otp = service(sender);
    otp.send("CUSTOMER", "9876543210");
    assertThrows(IllegalStateException.class, () -> otp.send("CUSTOMER", "9876543210")); // inside the 30 s gap
    assertEquals(1L, counts.get("sends:2026-10-10"));
  }

  @Test
  void wrongCodesPerNumberAreCappedForTheDayAcrossNewCodes() {
    OtpChallengeEntity[] saved = storeChallenges();
    OtpService otp = service(sender, new OtpLimits(1000, 3));
    otp.send("CUSTOMER", "9876543210");
    assertThrows(IllegalArgumentException.class, () -> otp.verify("CUSTOMER", "9876543210", "000000"));
    assertThrows(IllegalArgumentException.class, () -> otp.verify("CUSTOMER", "9876543210", "000001"));
    now = now.plusSeconds(31);
    otp.send("CUSTOMER", "9876543210"); // a new code resets the per-code attempts, not the daily count
    assertThrows(IllegalArgumentException.class, () -> otp.verify("CUSTOMER", "9876543210", "000002"));
    assertEquals(3L, counts.get(OtpLimits.wrongKey("9876543210", LocalDate.of(2026, 10, 10))));

    String code = "123456";
    saved[0].codeHash = OtpRules.hash(saved[0].id, code);
    IllegalArgumentException blocked = assertThrows(IllegalArgumentException.class, () -> otp.verify("CUSTOMER", "9876543210", code));
    assertEquals(OtpService.TOO_MANY_WRONG, blocked.getMessage(), "even the right code is refused once the cap is hit");
    now = now.plusSeconds(31);
    assertThrows(IllegalStateException.class, () -> otp.send("VENDOR", "9876543210"), "no more codes for that number, under either login");
    verify(sender, times(2)).send(any(), any());
  }

  @Test
  void refusesToStartWithoutASender() {
    IllegalStateException e = assertThrows(IllegalStateException.class, () -> service(null));
    assertTrue(e.getMessage().contains("WHATSAPP_"), e.getMessage());
  }

  @Test
  void aFailedSendDropsTheCodeAllowsARetryAndStillCounts() {
    OtpChallengeEntity[] saved = storeChallenges();
    doThrow(new IllegalStateException(WhatsAppOtpSender.FAILED)).doNothing().when(sender).send(eq("9876543210"), any());
    OtpService otp = service(sender);

    assertThrows(IllegalStateException.class, () -> otp.send("CUSTOMER", "9876543210"));
    assertNull(saved[0].codeHash, "an undelivered code must not be usable");
    assertNull(saved[0].lastSentAt, "the 30 s resend gap must not block the retry");
    assertEquals(1, saved[0].sendsInWindow);

    otp.send("CUSTOMER", "9876543210"); // retry straight away
    assertNotNull(saved[0].codeHash);
    assertEquals(2, saved[0].sendsInWindow);
  }

  private static String eq(String value) {
    return org.mockito.ArgumentMatchers.eq(value);
  }
}
