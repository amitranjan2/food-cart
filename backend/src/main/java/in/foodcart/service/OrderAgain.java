package in.foodcart.service;

import in.foodcart.data.OrderEntity;
import in.foodcart.domain.OrderStatus;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/** The dishes a customer has ordered before from one vendor, for the storefront's "Order again" row. */
public final class OrderAgain {
  private OrderAgain() {}

  public static final int LIMIT = 10;

  /** orders newest first; returns dish ids, most recently ordered first. Unpaid attempts don't count. */
  public static List<String> dishIds(List<OrderEntity> orders) {
    Set<String> ids = new LinkedHashSet<>();
    for (OrderEntity order : orders) {
      if (order.status == OrderStatus.PAYMENT_PENDING || order.status == OrderStatus.EXPIRED) continue;
      for (OrderEntity.Item item : order.items) {
        if (item.menuItemId != null) ids.add(item.menuItemId);
        if (ids.size() == LIMIT) return new ArrayList<>(ids);
      }
    }
    return new ArrayList<>(ids);
  }
}
