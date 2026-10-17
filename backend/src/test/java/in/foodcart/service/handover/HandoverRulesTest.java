package in.foodcart.service.handover;

import in.foodcart.data.Handover;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

class HandoverRulesTest {
  private final Instant t0 = Instant.parse("2026-10-10T10:00:00Z");
  private final HandoverRules.Party vendor = new HandoverRules.Party("VENDOR", "v1");
  private final HandoverRules.Party rider = new HandoverRules.Party("DELIVERY_PARTNER", "p7");

  private Handover handover() {
    Handover h = HandoverRules.issue();
    h.code = "2905";
    return h;
  }

  @Test
  void issuesFourDigitCodes() {
    for (int i = 0; i < 50; i++) assertTrue(HandoverRules.issue().code.matches("[0-9]{4}"));
  }

  @Test
  void theRightCodeRecordsWhoHandedOverAndWhen() {
    Handover h = handover();
    assertTrue(HandoverRules.verify(h, " 2905 ", rider, t0));
    assertEquals("DELIVERY_PARTNER", h.verifiedByRole);
    assertEquals("p7", h.verifiedById);
    assertEquals(t0, h.verifiedAt);
    assertThrows(IllegalStateException.class, () -> HandoverRules.verify(h, "2905", vendor, t0)); // only once
  }

  @Test
  void wrongCodesCountAndTheFifthLocksEntryForTenMinutes() {
    Handover h = handover();
    for (int i = 0; i < HandoverRules.MAX_ATTEMPTS; i++) assertFalse(HandoverRules.verify(h, "0000", vendor, t0));
    assertEquals(t0.plus(HandoverRules.LOCK), h.lockedUntil);
    assertThrows(IllegalStateException.class, () -> HandoverRules.verify(h, "2905", vendor, t0.plusSeconds(60)));
    assertTrue(HandoverRules.verify(h, "2905", vendor, t0.plus(HandoverRules.LOCK).plusSeconds(1)));
  }

  @Test
  void missingCodesNeverMatch() {
    Handover h = handover();
    assertFalse(HandoverRules.verify(h, null, vendor, t0));
    assertFalse(HandoverRules.verify(h, "", vendor, t0));
  }

  @Test
  void theCopyForTheHandingPartyHasNoCode() {
    Handover h = handover();
    h.attempts = 2;
    Handover copy = h.withoutCode();
    assertNull(copy.code);
    assertEquals(2, copy.attempts);
    assertEquals("2905", h.code);
  }
}
