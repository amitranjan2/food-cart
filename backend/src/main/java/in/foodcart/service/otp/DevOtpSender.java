package in.foodcart.service.otp;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Local development only: every code is 123456 and nothing is sent. Never active outside the "local" profile, and
 * stands aside when WHATSAPP_TOKEN is set so real WhatsApp delivery can be tried locally (WhatsAppOtpConfig).
 */
@Component
@Profile("local")
@ConditionalOnExpression("'${WHATSAPP_TOKEN:}' == ''")
public class DevOtpSender implements OtpSender {
  private static final Logger log = LoggerFactory.getLogger(DevOtpSender.class);

  @Override
  public void send(String mobile, String code) {
    log.info("Local OTP for {} is {}", mobile, code);
  }

  @Override
  public String fixedCode() {
    return "123456";
  }
}
