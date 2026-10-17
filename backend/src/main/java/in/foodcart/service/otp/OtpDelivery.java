package in.foodcart.service.otp;

import in.foodcart.data.OtpChallengeEntity;
import in.foodcart.data.OtpChallengeRepository;
import in.foodcart.data.WhatsAppMessageEntity;
import in.foodcart.data.WhatsAppMessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * Whether the latest login code reached WhatsApp, for the cart (tracker N3). Asked by the code's random reference,
 * which only the requester has, and answers only WAITING / DELIVERED / FAILED with a reason a customer can act on:
 * never "read", never Meta's raw error, nothing about other numbers.
 */
@Service
public class OtpDelivery {
  public enum State { WAITING, DELIVERED, FAILED }

  /** Long enough for a slow delivery; the cart stops asking after a minute anyway. */
  static final Duration ASKABLE = Duration.ofMinutes(10);
  /** Meta: the number has no WhatsApp, an old app, or hasn't accepted WhatsApp's terms. */
  static final Set<Integer> NOT_ON_WHATSAPP = Set.of(131026);
  static final String CHECK_NUMBER = "We couldn't reach this number on WhatsApp. Check it is right and has WhatsApp, then try again.";
  static final String TRY_AGAIN = "WhatsApp couldn't deliver the code. Wait a moment and tap Resend.";

  private final OtpChallengeRepository challenges;
  private final WhatsAppMessageRepository messages;
  private final Clock clock;

  @Autowired
  public OtpDelivery(OtpChallengeRepository challenges, WhatsAppMessageRepository messages) {
    this(challenges, messages, Clock.systemUTC());
  }

  OtpDelivery(OtpChallengeRepository challenges, WhatsAppMessageRepository messages, Clock clock) {
    this.challenges = challenges;
    this.messages = messages;
    this.clock = clock;
  }

  public Map<String, Object> status(String ref) {
    Map<String, Object> out = new LinkedHashMap<>();
    OtpChallengeEntity challenge = ref == null || ref.length() < 16 ? null : challenges.findByDeliveryRef(ref).orElse(null);
    Instant now = clock.instant();
    // An unknown or old reference looks the same as "no news yet": nothing to learn by guessing.
    if (challenge == null || challenge.lastSentAt == null || challenge.lastSentAt.plus(ASKABLE).isBefore(now)) {
      out.put("state", State.WAITING);
      return out;
    }
    String mobile = challenge.id.substring(challenge.id.indexOf(':') + 1);
    // The message recorded for this send: the newest to the number, not older than the send (minus clock slack).
    WhatsAppMessageEntity m = messages.findTop10ByMobileOrderBySentAtDesc(mobile).stream()
        .filter(x -> x.sentAt != null && !x.sentAt.isBefore(challenge.lastSentAt.minusSeconds(5)))
        .findFirst().orElse(null);
    if (m == null) {
      out.put("state", State.WAITING);
    } else if (m.status == WhatsAppMessageEntity.Status.FAILED) {
      out.put("state", State.FAILED);
      out.put("message", m.errorCode != null && NOT_ON_WHATSAPP.contains(m.errorCode) ? CHECK_NUMBER : TRY_AGAIN);
    } else if (m.status == WhatsAppMessageEntity.Status.DELIVERED || m.status == WhatsAppMessageEntity.Status.READ) {
      out.put("state", State.DELIVERED);
    } else {
      out.put("state", State.WAITING);
    }
    return out;
  }
}
