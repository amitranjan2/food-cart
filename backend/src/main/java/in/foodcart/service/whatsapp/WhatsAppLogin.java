package in.foodcart.service.whatsapp;

import in.foodcart.data.WaLoginEntity;
import in.foodcart.service.AuthService;
import in.foodcart.service.StoreQr;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * "Login with WhatsApp" (tracker N3), for while Meta withholds authentication templates: the customer sends
 * "Login SM-XXXXXX" to our number, WhatsApp tells us (signed webhook) which number sent it, and the browser that
 * started the login collects a session once. Works on any messaging limit and needs no template.
 *
 * Safe because: the sender's number comes from WhatsApp, not the user; the sender must match the number typed in;
 * the session goes only to the browser holding the 128-bit secret, once; codes expire after 10 minutes.
 */
@Service
public class WhatsAppLogin {
  private static final Logger log = LoggerFactory.getLogger(WhatsAppLogin.class);
  public static final Duration LIFETIME = Duration.ofMinutes(10);
  /** No 0/O, 1/I, 2/Z, 5/S or 8/B: easy to read aloud and nothing to mistype if sent by hand. */
  static final String ALPHABET = "ACDEFGHJKLMNPQRTUVWXY34679";
  static final Pattern CODE = Pattern.compile("\\bSM-([A-Z0-9]{6})\\b", Pattern.CASE_INSENSITIVE);
  static final String SIGNED_IN = "You're signed in to Supr-Mama ✅ You can go back to the app now.";
  static final String WRONG_NUMBER = "This login code was made for a different number. Go back to Supr-Mama, check the number you entered, and try again.";
  static final String EXPIRED = "That login code has expired. Go back to Supr-Mama and tap Verify on WhatsApp again.";
  private static final SecureRandom RANDOM = new SecureRandom();

  public enum State { WAITING, SIGNED_IN, WRONG_NUMBER, EXPIRED }

  private final MongoTemplate mongo;
  private final AuthService auth;
  private final String businessNumber;
  private final boolean webhookReady;
  private final Clock clock;

  @Autowired
  public WhatsAppLogin(MongoTemplate mongo, AuthService auth, @Value("${WHATSAPP_BUSINESS_NUMBER:}") String businessNumber,
      @Value("${WHATSAPP_APP_SECRET:}") String appSecret, @Value("${WHATSAPP_WEBHOOK_VERIFY_TOKEN:}") String verifyToken) {
    this(mongo, auth, businessNumber, !appSecret.isBlank() && !verifyToken.isBlank(), Clock.systemUTC());
  }

  WhatsAppLogin(MongoTemplate mongo, AuthService auth, String businessNumber, boolean webhookReady, Clock clock) {
    this.mongo = mongo;
    this.auth = auth;
    String digits = businessNumber == null ? "" : businessNumber.replaceAll("\\D", "");
    this.businessNumber = digits.length() == 10 ? "91" + digits : digits;
    this.webhookReady = webhookReady;
    this.clock = clock;
  }

  /** On only with our number and a working (signed) webhook: without the webhook nobody could ever finish. */
  public boolean enabled() {
    return webhookReady && businessNumber.length() >= 11;
  }

  /** Starts a login for a number. role is "customer" or "vendor", as in the URL. */
  public Map<String, Object> start(String role, String mobile) {
    if (!enabled()) throw new IllegalStateException("Login with WhatsApp isn't available right now.");
    String r = "vendor".equals(role) ? "VENDOR" : "customer".equals(role) ? "CUSTOMER" : null;
    if (r == null) throw new IllegalArgumentException("Unknown login type.");
    AuthService.validMobile(mobile);
    Instant now = clock.instant();
    WaLoginEntity login = new WaLoginEntity();
    login.id = secret();
    login.role = r;
    login.mobile = mobile;
    login.createdAt = now;
    login.expiresAt = now.plus(LIFETIME);
    login.purgeAt = now.plus(Duration.ofHours(1));
    for (int attempt = 0; ; attempt++) {
      login.code = "SM-" + code();
      try {
        mongo.insert(login);
        break;
      } catch (DuplicateKeyException clash) {
        if (attempt >= 4) throw clash; // ~3×10⁸ codes; a clash five times running means something else is wrong
      }
    }
    String text = "Login " + login.code;
    String link = "https://wa.me/" + businessNumber + "?text=" + URLEncoder.encode(text, StandardCharsets.UTF_8).replace("+", "%20");
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("secret", login.id);
    out.put("code", login.code);
    out.put("text", text);
    out.put("link", link);
    // "+91 92057 60890", the way the number is written on the stall's poster.
    out.put("number", businessNumber.length() == 12 && businessNumber.startsWith("91")
        ? "+91 " + businessNumber.substring(2, 7) + " " + businessNumber.substring(7) : "+" + businessNumber);
    out.put("expiresAt", login.expiresAt);
    // For laptops: scan with the phone that has WhatsApp. Generated here, so the page needs no QR library.
    out.put("qrSvg", StoreQr.svg(link));
    return out;
  }

  /**
   * The browser asking how its login is going. SIGNED_IN comes with the session token exactly once (an atomic
   * claim, so two tabs polling at once can't both get one).
   */
  public Map<String, Object> poll(String secret) {
    Map<String, Object> out = new LinkedHashMap<>();
    WaLoginEntity login = secret == null || secret.length() < 16 ? null : mongo.findById(secret, WaLoginEntity.class);
    Instant now = clock.instant();
    if (login == null || login.consumedAt != null) {
      out.put("state", State.EXPIRED);
      return out;
    }
    if (login.verifiedAt != null) {
      WaLoginEntity claimed = mongo.findAndModify(
          Query.query(Criteria.where("_id").is(secret).and("verifiedAt").ne(null).and("consumedAt").is(null)),
          new Update().set("consumedAt", now), FindAndModifyOptions.options().returnNew(true), WaLoginEntity.class);
      if (claimed == null) {
        out.put("state", State.EXPIRED);
        return out;
      }
      out.put("state", State.SIGNED_IN);
      out.put("role", claimed.role.toLowerCase());
      out.put("token", "VENDOR".equals(claimed.role) ? auth.vendorSignedIn(claimed.mobile) : auth.customerSignedIn(claimed.mobile));
      return out;
    }
    if (login.expiresAt.isBefore(now)) out.put("state", State.EXPIRED);
    else if (login.wrongNumberAt != null) out.put("state", State.WRONG_NUMBER);
    else out.put("state", State.WAITING);
    return out;
  }

  /**
   * A text message that reached our number (from the signed webhook). Returns the reply to send, or null when it
   * isn't a login message (ordinary customer messages are left alone).
   */
  public String inbound(String from, String body, String messageId) {
    if (from == null || body == null) return null;
    Matcher m = CODE.matcher(body);
    if (!m.find()) return null;
    String code = "SM-" + m.group(1).toUpperCase();
    WaLoginEntity login = mongo.findOne(Query.query(Criteria.where("code").is(code)), WaLoginEntity.class);
    Instant now = clock.instant();
    if (login == null || login.consumedAt != null || login.expiresAt.isBefore(now)) return EXPIRED;
    if (messageId != null && messageId.equals(login.messageId)) return null; // Meta retried the same webhook
    String digits = from.replaceAll("\\D", "");
    // Indian numbers only (the app stores 10 digits); WhatsApp sends them as 91 + 10 digits.
    String sender = digits.length() == 12 && digits.startsWith("91") ? digits.substring(2) : null;
    if (!login.mobile.equals(sender)) {
      mongo.updateFirst(Query.query(Criteria.where("_id").is(login.id).and("verifiedAt").is(null)), new Update().set("wrongNumberAt", now), WaLoginEntity.class);
      log.info("WhatsApp login code arrived from a different number");
      return WRONG_NUMBER;
    }
    mongo.updateFirst(Query.query(Criteria.where("_id").is(login.id).and("verifiedAt").is(null)),
        new Update().set("verifiedAt", now).set("messageId", messageId).unset("wrongNumberAt"), WaLoginEntity.class);
    return SIGNED_IN;
  }

  private static String secret() {
    byte[] bytes = new byte[16];
    RANDOM.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }

  private static String code() {
    StringBuilder s = new StringBuilder(6);
    for (int i = 0; i < 6; i++) s.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
    return s.toString();
  }
}
