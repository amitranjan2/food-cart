package in.foodcart.service.categories;

import java.util.Locale;
import java.util.regex.Pattern;

/** Rules for category names vendors type in, so the shared list stays tidy and free of near-duplicates. */
public final class CategoryNames {
  private CategoryNames() {}

  public static final int MIN = 2;
  public static final int MAX = 30;
  private static final Pattern ALLOWED = Pattern.compile("[\\p{L}\\p{N} &'\\-]+");
  private static final Pattern HAS_LETTER = Pattern.compile(".*\\p{L}.*");

  /** The display name: spaces tidied, each word capitalised ("mini rice bowl" → "Mini Rice Bowl"). */
  public static String clean(String input) {
    String name = input == null ? "" : input.trim().replaceAll("\\s+", " ");
    if (name.length() < MIN || name.length() > MAX) {
      throw new IllegalArgumentException("Category names are " + MIN + " to " + MAX + " characters.");
    }
    if (!ALLOWED.matcher(name).matches() || !HAS_LETTER.matcher(name).matches()) {
      throw new IllegalArgumentException("Use letters, numbers, spaces, &, ' or - in category names.");
    }
    StringBuilder out = new StringBuilder();
    for (String word : name.split(" ")) {
      if (out.length() > 0) out.append(' ');
      out.append(word.substring(0, 1).toUpperCase(Locale.ROOT)).append(word.substring(1).toLowerCase(Locale.ROOT));
    }
    return out.toString();
  }

  /**
   * What makes two names the same category: case, spaces, punctuation and a plural ending are ignored, so
   * "Momos", "momo" and "Mo-mos" are one category.
   */
  public static String key(String name) {
    String key = name.toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{N}]", "");
    if (key.length() > 3 && key.endsWith("ies")) return key.substring(0, key.length() - 3) + "y";
    if (key.length() > 3 && key.endsWith("s") && !key.endsWith("ss")) return key.substring(0, key.length() - 1);
    return key;
  }
}
