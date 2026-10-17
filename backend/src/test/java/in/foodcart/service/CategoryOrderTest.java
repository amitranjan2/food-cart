package in.foodcart.service;

import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CategoryOrderTest {
  @Test
  void placedCategoriesComeFirstAndTheRestKeepTheirOrder() {
    List<String> defaults = List.of("momos", "rolls", "drinks", "chaat");
    assertEquals(List.of("chaat", "momos", "rolls", "drinks"), CategoryOrder.sort(defaults, Function.identity(), List.of("chaat", "momos")));
  }

  @Test
  void noOrderKeepsTheDefault() {
    List<String> defaults = List.of("momos", "rolls");
    assertEquals(defaults, CategoryOrder.sort(defaults, Function.identity(), List.of()));
    assertEquals(defaults, CategoryOrder.sort(defaults, Function.identity(), null));
  }

  @Test
  void cleaningDropsUnknownRepeatedAndMissingIds() {
    assertEquals(List.of("rolls", "momos"),
        CategoryOrder.clean(Arrays.asList("rolls", "pizza", null, "momos", "rolls"), Set.of("momos", "rolls", "drinks")));
    assertEquals(List.of(), CategoryOrder.clean(null, Set.of("momos")));
  }
}
