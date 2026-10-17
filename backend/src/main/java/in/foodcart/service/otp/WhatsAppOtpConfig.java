package in.foodcart.service.otp;

import in.foodcart.service.whatsapp.WhatsAppDelivery;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * Turns on WhatsApp login codes when WHATSAPP_TOKEN is set, in any profile: in "local" it replaces the fixed 123456
 * code, so delivery can be tested before a payment gateway exists (production also needs one to start).
 * WHATSAPP_TEST_MODE=true (local only) sends Meta's sample hello_world template while the real OTP template awaits approval;
 * the login code stays 123456. To go live, unset it and set WHATSAPP_OTP_TEMPLATE and WHATSAPP_OTP_LANGUAGE.
 */
@Configuration
@ConditionalOnExpression("'${WHATSAPP_TOKEN:}' != ''")
public class WhatsAppOtpConfig {
  @Bean
  OtpSender whatsAppOtpSender(
      @Value("${WHATSAPP_TOKEN}") String token,
      @Value("${WHATSAPP_PHONE_NUMBER_ID:}") String phoneNumberId,
      @Value("${WHATSAPP_OTP_TEMPLATE:}") String template,
      @Value("${WHATSAPP_OTP_LANGUAGE:}") String language,
      @Value("${WHATSAPP_API_VERSION:}") String apiVersion,
      @Value("${WHATSAPP_API_BASE:https://graph.facebook.com}") String apiBase,
      @Value("${WHATSAPP_TEST_MODE:false}") boolean testMode,
      Environment environment,
      ObjectProvider<WhatsAppDelivery> delivery) {
    // Test mode makes every login code 123456, so on a real server anyone could sign in as anyone.
    if (testMode && !environment.acceptsProfiles(Profiles.of("local"))) {
      throw new IllegalStateException("WHATSAPP_TEST_MODE is for local testing only: it makes every login code 123456. Remove it and use the approved OTP template.");
    }
    List<String> missing = new ArrayList<>();
    if (phoneNumberId.isBlank()) missing.add("WHATSAPP_PHONE_NUMBER_ID");
    // No template yet (Meta withholds authentication templates below the 2,000 limit): codes are off and the apps use
    // Login with WhatsApp. Once the template is approved, setting WHATSAPP_OTP_TEMPLATE turns codes back on.
    if (!testMode && template.isBlank()) {
      if (apiVersion.isBlank()) missing.add("WHATSAPP_API_VERSION");
      if (!missing.isEmpty()) throw new IllegalStateException("WHATSAPP_TOKEN is set but these are missing: " + String.join(", ", missing));
      return new UnavailableOtpSender();
    }
    if (!testMode && language.isBlank()) missing.add("WHATSAPP_OTP_LANGUAGE");
    if (apiVersion.isBlank()) missing.add("WHATSAPP_API_VERSION");
    // Fail at startup, not on a customer's first login.
    if (!missing.isEmpty()) throw new IllegalStateException("WHATSAPP_TOKEN is set but these are missing: " + String.join(", ", missing));
    return new WhatsAppOtpSender(
        new WhatsAppOtpSender.Settings(token, phoneNumberId.trim(), template.trim(), language.trim(), apiVersion.trim(), testMode),
        apiBase.trim(), Duration.ofSeconds(5), recorder(delivery == null ? null : delivery.getIfAvailable()));
  }

  /** Delivery tracking when the store is there (always in the app; absent in some unit tests). */
  private static WhatsAppOtpSender.Recorder recorder(WhatsAppDelivery delivery) {
    return delivery == null ? (id, mobile, purpose) -> {} : delivery::sent;
  }
}
