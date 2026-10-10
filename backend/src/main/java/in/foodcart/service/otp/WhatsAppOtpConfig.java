package in.foodcart.service.otp;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * Turns on WhatsApp login codes when WHATSAPP_TOKEN is set, in any profile: in "local" it replaces the fixed 123456
 * code, so delivery can be tested before a payment gateway exists (production also needs one to start).
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
      @Value("${WHATSAPP_API_BASE:https://graph.facebook.com}") String apiBase) {
    List<String> missing = new ArrayList<>();
    if (phoneNumberId.isBlank()) missing.add("WHATSAPP_PHONE_NUMBER_ID");
    if (template.isBlank()) missing.add("WHATSAPP_OTP_TEMPLATE");
    if (language.isBlank()) missing.add("WHATSAPP_OTP_LANGUAGE");
    if (apiVersion.isBlank()) missing.add("WHATSAPP_API_VERSION");
    // Fail at startup, not on a customer's first login.
    if (!missing.isEmpty()) throw new IllegalStateException("WHATSAPP_TOKEN is set but these are missing: " + String.join(", ", missing));
    return new WhatsAppOtpSender(
        new WhatsAppOtpSender.Settings(token, phoneNumberId.trim(), template.trim(), language.trim(), apiVersion.trim()),
        apiBase.trim(), Duration.ofSeconds(5));
  }
}
