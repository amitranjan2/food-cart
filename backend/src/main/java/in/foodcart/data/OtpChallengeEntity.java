package in.foodcart.data;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/** One pending OTP per role + mobile. Mongo removes the document after it expires. */
@Document("otpChallenges")
public class OtpChallengeEntity {
  /** "VENDOR:9999999999" or "CUSTOMER:9999999999". */
  @Id public String id;
  public String codeHash;
  public int attempts;
  public Instant codeExpiresAt;
  public Instant lastSentAt;
  public Instant windowStartedAt;
  public int sendsInWindow;
  /** Keeps the send-count window alive after the code itself has expired. */
  @Indexed(expireAfterSeconds = 0) public Instant purgeAt;
}
