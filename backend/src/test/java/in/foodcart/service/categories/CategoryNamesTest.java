package in.foodcart.service.categories;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class CategoryNamesTest {
  @Test
  void tidiesAndCapitalises() {
    assertEquals("Mini Rice Bowl", CategoryNames.clean("  mini   RICE bowl "));
    assertEquals("All-in-1", CategoryNames.clean("ALL-IN-1"));
    assertEquals("Dal & Roti", CategoryNames.clean("dal & roti"));
  }

  @Test
  void refusesJunk() {
    for (String bad : new String[] {null, "", "a", "1234", "Momos!!!", "<script>", "x".repeat(31)}) {
      assertThrows(IllegalArgumentException.class, () -> CategoryNames.clean(bad), String.valueOf(bad));
    }
  }

  @Test
  void spellingsOfOneCategoryShareAKey() {
    assertEquals(CategoryNames.key("Momos"), CategoryNames.key("momo"));
    assertEquals(CategoryNames.key("Momos"), CategoryNames.key("Mo-mos"));
    assertEquals(CategoryNames.key("Curries"), CategoryNames.key("curry"));
    assertEquals(CategoryNames.key("Rice Bowl"), CategoryNames.key("ricebowls"));
    assertNotEquals(CategoryNames.key("Momos"), CategoryNames.key("Rolls"));
    assertEquals("glass", CategoryNames.key("Glass"));
  }
}
