package in.foodcart.service;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Why a vendor cancelled an order they had accepted (tracker S3.2). The keys are stored on the order; the vendor app's
 * cancel dialog and the storefront's order page show the same wording (keep the three lists in step).
 */
public final class CancelReasons {
  private CancelReasons() {}

  public static final Map<String, String> ALL = new LinkedHashMap<>();
  static {
    ALL.put("ITEM_UNAVAILABLE", "A dish ran out");
    ALL.put("STALL_CLOSING", "The stall had to close");
    ALL.put("TOO_BUSY", "The kitchen is too busy");
    ALL.put("OTHER", "Something came up at the stall");
  }

  public static String check(String key) {
    if (key == null || !ALL.containsKey(key)) throw new IllegalArgumentException("Pick a reason for cancelling.");
    return key;
  }
}
