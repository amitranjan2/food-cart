package in.foodcart.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Function;

/** The order a vendor gave their menu categories. Categories the vendor never placed keep their default order, after the placed ones. */
public final class CategoryOrder {
  private CategoryOrder() {}

  public static <T> List<T> sort(List<T> categories, Function<T, String> id, List<String> order) {
    List<T> sorted = new ArrayList<>(categories);
    if (order == null || order.isEmpty()) return sorted;
    // List.sort is stable, so unplaced categories stay in the order they came in.
    sorted.sort(Comparator.comparingInt(category -> {
      int at = order.indexOf(id.apply(category));
      return at < 0 ? Integer.MAX_VALUE : at;
    }));
    return sorted;
  }

  /** Keeps known ids only, each once, in the order given. */
  public static List<String> clean(List<String> wanted, Set<String> known) {
    Set<String> kept = new LinkedHashSet<>();
    for (String id : wanted == null ? List.<String>of() : wanted) {
      if (id != null && known.contains(id)) kept.add(id);
    }
    return new ArrayList<>(kept);
  }
}
