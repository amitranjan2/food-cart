package in.foodcart.service;

import in.foodcart.data.OrderEntity;
import in.foodcart.domain.OrderStatus;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class OrderAgainTest {
  private static OrderEntity order(OrderStatus status, String... dishIds) {
    OrderEntity order = new OrderEntity();
    order.status = status;
    for (String id : dishIds) {
      OrderEntity.Item item = new OrderEntity.Item();
      item.menuItemId = id;
      order.items.add(item);
    }
    return order;
  }

  @Test
  void mostRecentlyOrderedFirstEachOnce() {
    List<OrderEntity> newestFirst = List.of(
        order(OrderStatus.COMPLETED, "roll", "coffee"),
        order(OrderStatus.PLACED, "momos", "roll"),
        order(OrderStatus.REJECTED, "chaat"));
    assertEquals(List.of("roll", "coffee", "momos", "chaat"), OrderAgain.dishIds(newestFirst));
  }

  @Test
  void unpaidAttemptsDoNotCount() {
    assertEquals(List.of("roll"), OrderAgain.dishIds(List.of(
        order(OrderStatus.PAYMENT_PENDING, "momos"),
        order(OrderStatus.EXPIRED, "coffee"),
        order(OrderStatus.COMPLETED, "roll"))));
  }

  @Test
  void noOrdersMeansNoRow() {
    assertEquals(List.of(), OrderAgain.dishIds(List.of()));
  }

  @Test
  void keepsTheRowShort() {
    List<String> many = new ArrayList<>();
    for (int i = 0; i < 15; i++) many.add("dish" + i);
    assertEquals(OrderAgain.LIMIT, OrderAgain.dishIds(List.of(order(OrderStatus.COMPLETED, many.toArray(String[]::new)))).size());
  }
}
