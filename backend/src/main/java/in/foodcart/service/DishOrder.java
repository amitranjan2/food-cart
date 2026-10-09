package in.foodcart.service;

import in.foodcart.data.MenuItemEntity;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * The order of dishes inside one category, as the vendor arranged it. Dishes are listed by sortOrder and the menu
 * groups them by category, so renumbering just the arranged dishes is enough; other categories are left alone.
 */
public final class DishOrder {
  private DishOrder() {}

  /** Returns the vendor's dishes that changed. Ids that aren't this vendor's dishes, or repeat, are ignored. */
  public static List<MenuItemEntity> apply(List<MenuItemEntity> vendorDishes, List<String> ids) {
    Map<String, MenuItemEntity> byId = vendorDishes.stream().collect(Collectors.toMap(dish -> dish.id, Function.identity()));
    List<MenuItemEntity> arranged = new ArrayList<>();
    for (String id : new LinkedHashSet<>(ids == null ? List.<String>of() : ids)) {
      MenuItemEntity dish = byId.get(id);
      if (dish != null) arranged.add(dish);
    }
    // Reuse the slots these dishes already hold, so the category keeps its place among the vendor's other numbers.
    List<Integer> slots = arranged.stream().map(dish -> dish.sortOrder).sorted().toList();
    List<MenuItemEntity> changed = new ArrayList<>();
    for (int i = 0; i < arranged.size(); i++) {
      MenuItemEntity dish = arranged.get(i);
      int slot = slots.get(i);
      // Old data may repeat numbers; nudge repeats up so the order sticks.
      if (i > 0 && slot <= arranged.get(i - 1).sortOrder) slot = arranged.get(i - 1).sortOrder + 1;
      if (dish.sortOrder != slot) {
        dish.sortOrder = slot;
        changed.add(dish);
      }
    }
    return changed;
  }
}
