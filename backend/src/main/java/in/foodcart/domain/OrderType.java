package in.foodcart.domain;

/** How the customer collects the order. Delivery is V2. */
public enum OrderType {
  PICKUP,
  DINE_IN;

  public static OrderType parse(String value) {
    if (value != null) {
      for (OrderType type : values()) if (type.name().equals(value)) return type;
    }
    throw new IllegalArgumentException("Choose Pick Up or Dine In.");
  }
}
