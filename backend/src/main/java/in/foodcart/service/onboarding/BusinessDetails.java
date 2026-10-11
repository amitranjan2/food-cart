package in.foodcart.service.onboarding;

import in.foodcart.data.VendorBusinessEntity;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/** Checks and tidies a stall's licence and payout details. Pure, so it can be unit tested. Every field is optional. */
public final class BusinessDetails {
  private BusinessDetails() {}

  public record Input(String fssai, String pan, String payoutMethod, String upiId, String accountName, String accountNumber, String ifsc) {}

  /**
   * A field left out (null or blank) keeps what was saved: the app only ever sees the masked PAN and account number,
   * so it can't send them back. Choosing the other payout method drops the old method's details.
   */
  public static void apply(VendorBusinessEntity b, Input in) {
    String fssai = optional(digits(in.fssai()), "[0-9]{14}", "FSSAI number has 14 digits.");
    String pan = optional(upper(in.pan()), "[A-Z]{5}[0-9]{4}[A-Z]", "PAN looks like ABCDE1234F.");
    String method = upper(in.payoutMethod());
    if (method != null && !method.equals("UPI") && !method.equals("BANK")) throw new IllegalArgumentException("Pick UPI or bank account for payouts.");
    String upi = trim(in.upiId()) == null ? null : optional(trim(in.upiId()).toLowerCase(Locale.ROOT), "[a-z0-9._-]{2,256}@[a-z]{2,64}", "UPI ID looks like name@bank.");
    String name = trim(in.accountName());
    if (name != null && (name.length() < 2 || name.length() > 80)) throw new IllegalArgumentException("Account holder name must be 2 to 80 characters.");
    String account = optional(digits(in.accountNumber()), "[0-9]{9,18}", "Account number has 9 to 18 digits.");
    String ifsc = optional(upper(in.ifsc()), "[A-Z]{4}0[A-Z0-9]{6}", "IFSC looks like SBIN0001234.");

    if (fssai != null) b.fssai = fssai;
    if (pan != null) b.pan = pan;
    if (method != null && !method.equals(b.payoutMethod)) {
      b.payoutMethod = method;
      b.upiId = b.accountName = b.accountNumber = b.ifsc = null;
    }
    if ("UPI".equals(b.payoutMethod)) {
      if (upi != null) b.upiId = upi;
    } else if ("BANK".equals(b.payoutMethod)) {
      if (name != null) b.accountName = name;
      if (account != null) b.accountNumber = account;
      if (ifsc != null) b.ifsc = ifsc;
    }
  }

  /** All of it, enough for the team to set up payouts. */
  public static boolean complete(VendorBusinessEntity b) {
    if (b == null || b.fssai == null || b.pan == null || b.payoutMethod == null) return false;
    return "UPI".equals(b.payoutMethod) ? b.upiId != null : b.accountName != null && b.accountNumber != null && b.ifsc != null;
  }

  /** What the vendor app shows back: enough to recognise, not enough to copy. */
  public static Map<String, Object> masked(VendorBusinessEntity b) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("fssai", b == null ? null : b.fssai);
    m.put("pan", b == null || b.pan == null ? null : b.pan.substring(0, 2) + "•••••" + b.pan.substring(7));
    m.put("payoutMethod", b == null ? null : b.payoutMethod);
    m.put("upiId", b == null ? null : b.upiId);
    m.put("accountName", b == null ? null : b.accountName);
    m.put("accountNumber", b == null || b.accountNumber == null ? null : "••••" + b.accountNumber.substring(b.accountNumber.length() - 4));
    m.put("ifsc", b == null ? null : b.ifsc);
    m.put("complete", complete(b));
    return m;
  }

  private static String optional(String value, String pattern, String message) {
    if (value == null) return null;
    if (!value.matches(pattern)) throw new IllegalArgumentException(message);
    return value;
  }

  private static String trim(String s) {
    if (s == null || s.isBlank()) return null;
    return s.trim().replaceAll("\\s+", " ");
  }

  private static String upper(String s) {
    String t = trim(s);
    return t == null ? null : t.replace(" ", "").toUpperCase(Locale.ROOT);
  }

  private static String digits(String s) {
    String t = trim(s);
    return t == null ? null : t.replaceAll("[\\s-]", "");
  }
}
