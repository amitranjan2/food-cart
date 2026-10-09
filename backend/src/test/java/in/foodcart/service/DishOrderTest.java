package in.foodcart.service;

import in.foodcart.data.MenuItemEntity;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class DishOrderTest {
  private static MenuItemEntity dish(String id, int sortOrder) {
    MenuItemEntity dish = new MenuItemEntity();
    dish.id = id;
    dish.sortOrder = sortOrder;
    return dish;
  }

  private static List<String> sorted(List<MenuItemEntity> dishes) {
    return dishes.stream().sorted(Comparator.comparingInt(dish -> dish.sortOrder)).map(dish -> dish.id).toList();
  }

  @Test
  void arrangesOneCategoryAndLeavesTheOthersAlone() {
    MenuItemEntity veg = dish("veg", 0), chicken = dish("chicken", 1), roll = dish("roll", 2), paneer = dish("paneer", 3);
    List<MenuItemEntity> all = List.of(veg, chicken, roll, paneer);
    List<MenuItemEntity> changed = DishOrder.apply(all, List.of("paneer", "veg", "chicken"));
    // Momos (paneer, veg, chicken) reuse their slots 0, 1, 3; the roll keeps 2.
    assertEquals(List.of("paneer", "veg", "roll", "chicken"), sorted(all));
    assertEquals(2, roll.sortOrder);
    assertEquals(3, changed.size());
  }

  @Test
  void ignoresUnknownAndRepeatedIdsAndFixesRepeatedNumbers() {
    MenuItemEntity a = dish("a", 5), b = dish("b", 5), c = dish("c", 5);
    DishOrder.apply(List.of(a, b, c), Arrays.asList("c", "nope", "a", "c", null, "b"));
    assertEquals(List.of("c", "a", "b"), sorted(List.of(a, b, c)));
  }
}
