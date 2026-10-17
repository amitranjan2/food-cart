package in.foodcart.service.otp;

/** Delivers a one-time code to a mobile number. Exactly one implementation is active per environment. */
public interface OtpSender {
  void send(String mobile, String code);

  /** A fixed code for local development only. Real senders return null so a random code is generated. */
  default String fixedCode() {
    return null;
  }

  /** False when codes can't be sent at all (no approved template yet), so the apps offer Login with WhatsApp instead. */
  default boolean available() {
    return true;
  }
}
