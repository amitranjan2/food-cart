package in.foodcart.service;

import java.text.Normalizer;
import java.util.Locale;
import java.util.Set;

/** Rules for a store's link name: suprmama.in/{slug}. Pure, so it can be unit tested. */
public final class StoreSlugs {
  private StoreSlugs() {}

  /**
   * Taken by the storefront's own pages or kept for later ones. The four policy pages take priority over /{slug} in
   * the storefront, so a store with one of these names could never be opened.
   */
  public static final Set<String> RESERVED = Set.of(
      "terms", "privacy", "refunds", "contact", "about", "help", "support", "faq",
      "api", "admin", "app", "apps", "vendor", "vendors", "login", "signup", "account", "me",
      "order", "orders", "cart", "checkout", "pay", "payment", "payments", "qr", "home", "search",
      "uploads", "static", "assets", "category-art", "www", "mail", "blog", "suprmama", "supr-mama");

  /** Lowercase letters, digits and single hyphens; 3–40 long; no hyphen at either end. */
  public static String check(String slug) {
    String s = slug == null ? "" : slug.trim().toLowerCase(Locale.ROOT);
    if (s.length() < 3 || s.length() > 40) throw new IllegalArgumentException("Store link must be 3 to 40 characters.");
    if (!s.matches("[a-z0-9]+(-[a-z0-9]+)*")) {
      throw new IllegalArgumentException("Store link can use only a-z, 0-9 and single hyphens, e.g. raju-momos.");
    }
    if (RESERVED.contains(s)) throw new IllegalArgumentException("\"" + s + "\" is reserved. Pick another store link.");
    return s;
  }

  /** A link name made from the business name: "Raju's Momos & Rolls" → "rajus-momos-rolls". */
  public static String fromName(String name) {
    String plain = Normalizer.normalize(name == null ? "" : name, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
    String s = plain.toLowerCase(Locale.ROOT).replace("'", "").replaceAll("[^a-z0-9]+", "-").replaceAll("^-+|-+$", "");
    return s.length() > 40 ? s.substring(0, 40).replaceAll("-+$", "") : s;
  }
}
