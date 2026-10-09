package in.foodcart.service;

import in.foodcart.data.OrderEntity;
import in.foodcart.domain.OrderStatus;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** The dishes a customer has ordered before from one vendor, for the storefront's "Order again" row. */
public final class OrderAgain {
  private OrderAgain() {}

  public static final int LIMIT = 10;

  /**
   * orders newest first; returns dish ids ordered most often first, counting each order once (5 plates in one order
   * is one order), ties going to the most recently ordered. Unpaid attempts don't count.
   */
  public static List<String> dishIds(List<OrderEntity> orders) {
    // Insertion order = most recent first, which a stable sort keeps for ties.
    Map<String, Integer> counts = new LinkedHashMap<>();
    for (OrderEntity order : orders) {
      if (order.status == OrderStatus.PAYMENT_PENDING || order.status == OrderStatus.EXPIRED) continue;
      Set<String> inThisOrder = new HashSet<>();
      for (OrderEntity.Item item : order.items) {
        if (item.menuItemId != null && inThisOrder.add(item.menuItemId)) counts.merge(item.menuItemId, 1, Integer::sum);
      }
    }
    List<String> ids = new ArrayList<>(counts.keySet());
    ids.sort((a, b) -> counts.get(b) - counts.get(a));
    return ids.size() > LIMIT ? new ArrayList<>(ids.subList(0, LIMIT)) : ids;
  }
}
