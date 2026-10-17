package in.foodcart.data;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/** A daily login-code counter ("sends:2026-10-10", "wrong:9876543210:2026-10-10"). Mongo removes it after purgeAt. */
@Document("otpCounters")
public class OtpCounterEntity {
  @Id public String id;
  public long count;
  @Indexed(expireAfterSeconds = 0) public Instant purgeAt;
}
