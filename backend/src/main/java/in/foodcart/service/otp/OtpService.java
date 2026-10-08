package in.foodcart.service.otp;

import in.foodcart.data.OtpChallengeEntity;
import in.foodcart.data.OtpChallengeRepository;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class OtpService {
  private final OtpChallengeRepository challenges;
  private final OtpSender sender;

  public OtpService(OtpChallengeRepository challenges, ObjectProvider<OtpSender> senders) {
    this.challenges = challenges;
    this.sender = senders.getIfAvailable();
    if (this.sender == null) {
      throw new IllegalStateException(
          "No SMS provider is configured, so OTP login cannot work. "
              + "Run with the 'local' profile for development, or configure an SMS sender for production.");
    }
  }

  /** Sends a code. Callers decide whether the mobile is allowed to log in before calling this. */
  public void send(String role, String mobile) {
    String id = role + ":" + mobile;
    OtpChallengeEntity challenge = challenges.findById(id).orElseGet(() -> {
      OtpChallengeEntity fresh = new OtpChallengeEntity();
      fresh.id = id;
      return fresh;
    });
    String code = sender.fixedCode() != null ? sender.fixedCode() : OtpRules.newCode();
    OtpRules.recordSend(challenge, code, Instant.now());
    challenges.save(challenge);
    sender.send(mobile, code);
  }

  public void verify(String role, String mobile, String code) {
    OtpChallengeEntity challenge = challenges.findById(role + ":" + mobile).orElse(null);
    boolean ok = OtpRules.check(challenge, code, Instant.now());
    challenges.save(challenge);
    if (!ok) throw new IllegalArgumentException("Invalid OTP");
  }
}
