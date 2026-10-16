package in.foodcart.data;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * One WhatsApp message we sent (a login code) and what Meta's webhook said happened to it. Kept 30 days for delivery
 * stats and "my code never came" support questions, then Mongo removes it. The code itself is never stored here.
 */
@Document("whatsappMessages")
@CompoundIndex(name = "mobile_sent", def = "{'mobile': 1, 'sentAt': -1}")
public class WhatsAppMessageEntity {
  public enum Status { ACCEPTED, SENT, DELIVERED, READ, FAILED }

  /** Meta's message id ("wamid.…"). */
  @Id public String id;
  /** "OTP" for login codes; "OTP_TEST" for the local hello_world test mode. */
  public String purpose;
  /** 10 Indian digits, as stored on customers and vendors. */
  public String mobile;
  @Indexed public Instant sentAt;
  public Status status = Status.ACCEPTED;
  public Instant statusAt, deliveredAt, readAt, failedAt;
  /** Meta's error code and title when the message failed (e.g. 131026 "Message undeliverable"). */
  public Integer errorCode;
  public String errorTitle;
  @Indexed(expireAfterSeconds = 0) public Instant purgeAt;
}
