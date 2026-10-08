package in.foodcart.service.otp;

import in.foodcart.data.OtpChallengeEntity;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

class OtpRulesTest {
  private final Instant t0 = Instant.parse("2026-10-09T10:00:00Z");

  private OtpChallengeEntity challenge() {
    OtpChallengeEntity c = new OtpChallengeEntity();
    c.id = "CUSTOMER:9876543210";
    return c;
  }

  @Test
  void newCodesAreSixDigits() {
    for (int i = 0; i < 50; i++) assertTrue(OtpRules.newCode().matches("[0-9]{6}"));
  }

  @Test
  void storesOnlyAHashAndAcceptsTheRightCodeOnce() {
    OtpChallengeEntity c = challenge();
    OtpRules.recordSend(c, "482913", t0);
    assertNotEquals("482913", c.codeHash);
    assertTrue(OtpRules.check(c, "482913", t0.plusSeconds(60)));
    assertThrows(IllegalArgumentException.class, () -> OtpRules.check(c, "482913", t0.plusSeconds(61)));
  }

  @Test
  void wrongCodesCountAndLockAfterFiveAttempts() {
    OtpChallengeEntity c = challenge();
    OtpRules.recordSend(c, "482913", t0);
    for (int i = 0; i < OtpRules.MAX_ATTEMPTS; i++) assertFalse(OtpRules.check(c, "000000", t0));
    assertThrows(IllegalArgumentException.class, () -> OtpRules.check(c, "482913", t0));
  }

  @Test
  void codesExpireAfterFiveMinutes() {
    OtpChallengeEntity c = challenge();
    OtpRules.recordSend(c, "482913", t0);
    assertThrows(IllegalArgumentException.class, () -> OtpRules.check(c, "482913", t0.plus(OtpRules.CODE_LIFETIME).plusSeconds(1)));
  }

  @Test
  void enforcesResendGapAndHourlyLimit() {
    OtpChallengeEntity c = challenge();
    OtpRules.recordSend(c, "111111", t0);
    assertThrows(IllegalStateException.class, () -> OtpRules.recordSend(c, "222222", t0.plusSeconds(10)));
    Instant at = t0;
    for (int i = 1; i < OtpRules.MAX_SENDS_PER_WINDOW; i++) {
      at = at.plusSeconds(31);
      OtpRules.recordSend(c, "111111", at);
    }
    Instant blocked = at.plusSeconds(31);
    assertThrows(IllegalStateException.class, () -> OtpRules.recordSend(c, "111111", blocked));
    OtpRules.recordSend(c, "111111", t0.plus(OtpRules.SEND_WINDOW).plusSeconds(1));
  }

  @Test
  void aCodeForOneNumberDoesNotHashTheSameForAnother() {
    assertNotEquals(OtpRules.hash("CUSTOMER:9876543210", "123456"), OtpRules.hash("VENDOR:9876543210", "123456"));
  }
}
