package in.foodcart.service.otp;

import in.foodcart.data.OtpChallengeEntity;
import in.foodcart.data.OtpChallengeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;

@Service
public class OtpService {
  private static final Logger log = LoggerFactory.getLogger(OtpService.class);
  static final String SENDS_PAUSED = "Login codes are paused for today. Please try again tomorrow.";
  static final String TOO_MANY_WRONG = "Too many wrong codes for this number today. Try again tomorrow.";

  private final OtpChallengeRepository challenges;
  private final OtpSender sender;
  private final OtpCounters counters;
  private final OtpLimits limits;
  private final Clock clock;

  @Autowired
  public OtpService(OtpChallengeRepository challenges, ObjectProvider<OtpSender> senders, OtpCounters counters,
      @Value("${app.otp.daily-send-cap:1000}") int dailySendCap, @Value("${app.otp.daily-wrong-codes-per-number:15}") int dailyWrongCodes) {
    this(challenges, senders, counters, new OtpLimits(dailySendCap, dailyWrongCodes), Clock.systemUTC());
  }

  OtpService(OtpChallengeRepository challenges, ObjectProvider<OtpSender> senders, OtpCounters counters, OtpLimits limits, Clock clock) {
    this.challenges = challenges;
    this.counters = counters;
    this.limits = limits;
    this.clock = clock;
    this.sender = senders.getIfAvailable();
    if (this.sender == null) {
      throw new IllegalStateException(
          "No OTP sender is configured, so login cannot work. Run with the 'local' profile for development, "
              + "or set the WHATSAPP_* variables (see README) for production.");
    }
  }

  /** Sends a code. Callers decide whether the mobile is allowed to log in before calling this. */
  public void send(String role, String mobile) {
    Instant now = clock.instant();
    LocalDate day = OtpLimits.day(now);
    // A number that used up its wrong guesses gets no more codes today: they would only cost a WhatsApp message each.
    if (counters.count(OtpLimits.wrongKey(mobile, day)) >= limits.dailyWrongCodesPerNumber()) throw new IllegalStateException(TOO_MANY_WRONG);
    String id = role + ":" + mobile;
    OtpChallengeEntity challenge = challenges.findById(id).orElseGet(() -> {
      OtpChallengeEntity fresh = new OtpChallengeEntity();
      fresh.id = id;
      return fresh;
    });
    String code = sender.fixedCode() != null ? sender.fixedCode() : OtpRules.newCode();
    OtpRules.recordSend(challenge, code, now);
    // Counted after the per-number checks, so refused requests don't use up the day's allowance.
    long sentToday = counters.add(OtpLimits.sendsKey(day), day);
    if (sentToday > limits.dailySendCap()) {
      if (sentToday == limits.dailySendCap() + 1L) log.error("Daily login-code cap ({}) reached: no more codes are sent until midnight India time. Raise OTP_DAILY_SEND_CAP if this is real traffic.", limits.dailySendCap());
      throw new IllegalStateException(SENDS_PAUSED);
    }
    challenges.save(challenge);
    try {
      sender.send(mobile, code);
    } catch (RuntimeException failed) {
      // The code never arrived: drop it and allow an immediate retry. The send still counts towards the hourly limit.
      challenge.codeHash = null;
      challenge.codeExpiresAt = null;
      challenge.lastSentAt = null;
      challenges.save(challenge);
      throw failed;
    }
  }

  public void verify(String role, String mobile, String code) {
    Instant now = clock.instant();
    LocalDate day = OtpLimits.day(now);
    String wrong = OtpLimits.wrongKey(mobile, day);
    if (counters.count(wrong) >= limits.dailyWrongCodesPerNumber()) throw new IllegalArgumentException(TOO_MANY_WRONG);
    OtpChallengeEntity challenge = challenges.findById(role + ":" + mobile).orElse(null);
    boolean ok = OtpRules.check(challenge, code, now);
    challenges.save(challenge);
    if (!ok) {
      counters.add(wrong, day);
      throw new IllegalArgumentException("Invalid OTP");
    }
  }
}
