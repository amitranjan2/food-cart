package in.foodcart.service.otp;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

/**
 * Daily limits on login codes (tracker S4.8), on top of the per-number hourly ones in OtpRules:
 * a cap on WhatsApp sends across all numbers (each one costs money, and it bounds the bill if someone scripts the
 * login form) and a cap on wrong codes per number per day (5 wrong tries per code × many codes would otherwise let
 * someone keep guessing).
 */
public record OtpLimits(int dailySendCap, int dailyWrongCodesPerNumber) {
  static final ZoneId ZONE = ZoneId.of("Asia/Kolkata");

  public OtpLimits {
    if (dailySendCap < 1 || dailyWrongCodesPerNumber < 1) throw new IllegalArgumentException("OTP limits must be at least 1");
  }

  static LocalDate day(Instant now) {
    return LocalDate.ofInstant(now, ZONE);
  }

  static String sendsKey(LocalDate day) {
    return "sends:" + day;
  }

  /** Per number, not per role: a guesser shouldn't get a second allowance by switching between vendor and customer login. */
  static String wrongKey(String mobile, LocalDate day) {
    return "wrong:" + mobile + ":" + day;
  }
}
