package in.foodcart.service.handover;

import in.foodcart.data.Handover;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;

/**
 * Handover code rules, independent of who hands over (vendor counter now, delivery partner later).
 * Pure, kept free of Spring and Mongo so they can be unit tested.
 */
public final class HandoverRules {
  public static final int MAX_ATTEMPTS = 5;
  /** 5 wrong tries lock entry for 10 minutes, so the 10,000 possible codes can't be guessed. */
  public static final Duration LOCK = Duration.ofMinutes(10);

  private static final SecureRandom RANDOM = new SecureRandom();

  private HandoverRules() {}

  /** Who is entering the code, e.g. ("VENDOR", vendorId) or later ("DELIVERY_PARTNER", partnerId). */
  public record Party(String role, String id) {}

  public static Handover issue() {
    Handover h = new Handover();
    h.code = String.format("%04d", RANDOM.nextInt(10_000));
    return h;
  }

  /**
   * Checks the code the receiver gave. On success records who verified it and when. A wrong code counts an attempt;
   * the 5th wrong attempt locks entry. The caller saves the handover either way.
   */
  public static boolean verify(Handover h, String given, Party party, Instant now) {
    if (h.verifiedAt != null) throw new IllegalStateException("This order has already been handed over.");
    if (h.lockedUntil != null && now.isBefore(h.lockedUntil)) {
      throw new IllegalStateException("Too many wrong codes. Try again in a few minutes, or ask the customer to refresh their order page.");
    }
    if (h.lockedUntil != null) {
      h.lockedUntil = null;
      h.attempts = 0;
    }
    boolean match = given != null && h.code != null
        && MessageDigest.isEqual(given.trim().getBytes(StandardCharsets.UTF_8), h.code.getBytes(StandardCharsets.UTF_8));
    if (match) {
      h.verifiedAt = now;
      h.verifiedByRole = party.role();
      h.verifiedById = party.id();
      return true;
    }
    h.attempts++;
    if (h.attempts >= MAX_ATTEMPTS) h.lockedUntil = now.plus(LOCK);
    return false;
  }
}
