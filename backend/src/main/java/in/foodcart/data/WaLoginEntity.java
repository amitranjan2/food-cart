package in.foodcart.data;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * One "Login with WhatsApp" attempt (tracker N3): the browser holds `id` (secret) and shows `code`; the customer sends
 * the code to our WhatsApp number, and the webhook proves which number sent it. Removed an hour after it was made.
 */
@Document("waLogins")
public class WaLoginEntity {
  /** 128-bit secret only the browser that started the login has; it polls with it and gets the session once. */
  @Id public String id;
  /** "SM-7F3K9Q": what the customer sends. Public by design: it only works from the number entered. */
  @Indexed(unique = true) public String code;
  /** CUSTOMER or VENDOR. */
  public String role;
  /** The 10-digit number the user typed; the WhatsApp sender must match it. */
  public String mobile;
  public Instant createdAt, expiresAt;
  /** Set by the webhook when the code arrived from the right number. */
  public Instant verifiedAt;
  /** Set when the code arrived from a different number (shown to the browser, which may try again). */
  public Instant wrongNumberAt;
  /** Set when the browser collected its session; the login can't be used again. */
  public Instant consumedAt;
  /** Meta's id of the message that verified it, so a retried webhook doesn't reply twice. */
  public String messageId;
  @Indexed(expireAfterSeconds = 0) public Instant purgeAt;
}
