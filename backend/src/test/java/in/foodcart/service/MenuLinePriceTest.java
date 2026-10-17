package in.foodcart.service;

import in.foodcart.data.MenuItemEntity;
import in.foodcart.data.MenuItemEntity.CustomVariant;
import in.foodcart.data.MenuItemEntity.SizeOption;
import in.foodcart.data.MenuItemEntity.VariantOption;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class MenuLinePriceTest {
  @Test
  void addsSizeAndPricedOptionsToTheBasePrice() {
    MenuLinePrice.Quote quote = MenuLinePrice.quote(
        noodles(),
        "FULL",
        "full",
        List.of(
            new MenuLinePrice.Pick("addons", List.of("tomato")),
            new MenuLinePrice.Pick("sides", List.of("coke"))));
    assertEquals(0, quote.price().compareTo(new BigDecimal("200")));
    assertEquals("Full", quote.portion());
    assertEquals("Tomato, Coke", quote.summary());
  }

  @Test
  void keepsHalfPlateAsAReplacementPrice() {
    MenuItemEntity item = new MenuItemEntity();
    item.price = new BigDecimal("110");
    item.halfPrice = new BigDecimal("55");
    MenuLinePrice.Quote quote = MenuLinePrice.quote(item, "HALF", null, List.of());
    assertEquals(0, quote.price().compareTo(new BigDecimal("55")));
    assertEquals("HALF", quote.portion());
    assertNull(quote.summary());
  }

  @Test
  void rejectsAMissingRequiredOptionAndAStaleSize() {
    assertThrows(IllegalArgumentException.class, () -> MenuLinePrice.quote(noodles(), "FULL", "full", List.of()));
    assertThrows(IllegalArgumentException.class, () -> MenuLinePrice.quote(noodles(), "FULL", null, List.of(new MenuLinePrice.Pick("addons", List.of("tomato")))));
    assertThrows(IllegalArgumentException.class, () -> MenuLinePrice.quote(
        noodles(),
        "FULL",
        "full",
        List.of(new MenuLinePrice.Pick("addons", List.of("missing")))));
    MenuItemEntity single = noodles();
    single.variants.get(1).selection = "SINGLE";
    assertThrows(IllegalArgumentException.class, () -> MenuLinePrice.quote(
        single,
        "FULL",
        "full",
        List.of(
            new MenuLinePrice.Pick("addons", List.of("tomato")),
            new MenuLinePrice.Pick("sides", List.of("coke", "lassi")))));
  }

  private static MenuItemEntity noodles() {
    MenuItemEntity item = new MenuItemEntity();
    item.name = "Noodles";
    item.price = new BigDecimal("100");
    item.sizes = List.of(size("half", "Half", "0"), size("full", "Full", "50"));
    item.variants = List.of(
        variant("addons", "Add-Ons", true, "MULTIPLE", false, option("tomato", "Tomato", "0"), option("chicken", "Chicken", "0")),
        variant("sides", "Sides", false, "MULTIPLE", true, option("coke", "Coke", "50"), option("lassi", "Lassi", "30")));
    return item;
  }

  private static SizeOption size(String id, String name, String price) {
    SizeOption size = new SizeOption();
    size.id = id;
    size.name = name;
    size.price = new BigDecimal(price);
    return size;
  }

  private static CustomVariant variant(String id, String name, boolean required, String selection, boolean priceIncreases, VariantOption... options) {
    CustomVariant variant = new CustomVariant();
    variant.id = id;
    variant.name = name;
    variant.required = required;
    variant.selection = selection;
    variant.priceIncreases = priceIncreases;
    variant.options = List.of(options);
    return variant;
  }

  private static VariantOption option(String id, String name, String price) {
    VariantOption option = new VariantOption();
    option.id = id;
    option.name = name;
    option.foodType = "VEG";
    option.price = new BigDecimal(price);
    return option;
  }
}
