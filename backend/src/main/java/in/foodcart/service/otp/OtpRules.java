package in.foodcart.service.otp;

import in.foodcart.data.OtpChallengeEntity;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;

/** Pure OTP rules, kept free of Spring and Mongo so they can be unit tested. */
public final class OtpRules {
  public static final Duration CODE_LIFETIME = Duration.ofMinutes(5);
  public static final Duration RESEND_GAP = Duration.ofSeconds(30);
  public static final Duration SEND_WINDOW = Duration.ofHours(1);
  public static final int MAX_SENDS_PER_WINDOW = 5;
  public static final int MAX_ATTEMPTS = 5;

  private static final SecureRandom RANDOM = new SecureRandom();

  private OtpRules() {}

  public static String newCode() {
    return String.format("%06d", RANDOM.nextInt(1_000_000));
  }

  /** Hash bound to the challenge id so a leaked hash can't be replayed for another number. */
  public static String hash(String challengeId, String code) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] bytes = digest.digest((challengeId + ":" + code).getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(bytes);
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }

  /** Throws if another code can't be sent yet; otherwise records the send on the challenge. */
  public static void recordSend(OtpChallengeEntity challenge, String code, Instant now) {
    if (challenge.lastSentAt != null && challenge.lastSentAt.plus(RESEND_GAP).isAfter(now)) {
      throw new IllegalStateException("Please wait a few seconds before requesting another OTP.");
    }
    if (challenge.windowStartedAt == null || challenge.windowStartedAt.plus(SEND_WINDOW).isBefore(now)) {
      challenge.windowStartedAt = now;
      challenge.sendsInWindow = 0;
    }
    if (challenge.sendsInWindow >= MAX_SENDS_PER_WINDOW) {
      throw new IllegalStateException("Too many OTP requests. Try again in an hour.");
    }
    challenge.sendsInWindow++;
    challenge.lastSentAt = now;
    challenge.codeHash = hash(challenge.id, code);
    challenge.attempts = 0;
    challenge.codeExpiresAt = now.plus(CODE_LIFETIME);
    challenge.purgeAt = challenge.windowStartedAt.plus(SEND_WINDOW);
  }

  /** Returns true when the code matches. Wrong codes count as attempts; the caller must save the challenge. */
  public static boolean check(OtpChallengeEntity challenge, String code, Instant now) {
    if (challenge == null || challenge.codeHash == null || challenge.codeExpiresAt == null || challenge.codeExpiresAt.isBefore(now)) {
      throw new IllegalArgumentException("OTP expired. Request a new one.");
    }
    if (challenge.attempts >= MAX_ATTEMPTS) {
      throw new IllegalArgumentException("Too many wrong attempts. Request a new OTP.");
    }
    boolean match = code != null && MessageDigest.isEqual(
        hash(challenge.id, code).getBytes(StandardCharsets.UTF_8),
        challenge.codeHash.getBytes(StandardCharsets.UTF_8));
    if (match) {
      challenge.codeHash = null;
      challenge.codeExpiresAt = null;
    } else {
      challenge.attempts++;
    }
    return match;
  }
}
