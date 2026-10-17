package in.foodcart.domain;

/**
 * How the customer pays. ONLINE: through the gateway before the stall sees the order. CASH: at the stall when they
 * collect (cash or the stall's own UPI); the launch default while online payment isn't set up (tracker S2.19).
 */
public enum PaymentMethod {
  ONLINE, CASH;

  public static PaymentMethod parse(String s) {
    if (s == null || s.isBlank()) return ONLINE;
    try {
      return valueOf(s.trim().toUpperCase());
    } catch (IllegalArgumentException e) {
      throw new IllegalArgumentException("Unknown payment method " + s);
    }
  }
}
