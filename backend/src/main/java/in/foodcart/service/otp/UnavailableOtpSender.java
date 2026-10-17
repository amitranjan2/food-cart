package in.foodcart.service.otp;

/**
 * Stands in when WhatsApp is set up but there is no approved OTP template yet: login codes are refused with a message
 * pointing to Login with WhatsApp, and GET /api/auth/methods reports codes as off.
 */
public class UnavailableOtpSender implements OtpSender {
  static final String USE_WHATSAPP = "Login codes aren't available yet. Use Verify on WhatsApp instead.";

  @Override
  public void send(String mobile, String code) {
    throw new IllegalStateException(USE_WHATSAPP);
  }

  @Override
  public boolean available() {
    return false;
  }
}
