package in.foodcart.service;

import in.foodcart.data.MenuItemEntity;
import in.foodcart.data.MenuItemEntity.CustomVariant;
import in.foodcart.data.MenuItemEntity.SizeOption;
import in.foodcart.data.MenuItemEntity.VariantOption;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MenuItemDetailsTest {
  @Test
  void storesAPlainDish() {
    MenuItemEntity item = new MenuItemEntity();
    MenuItemEntity source = input("Veg Momos", "80");
    item.halfPrice = new BigDecimal("40");
    item.available = false;
    MenuItemDetails.apply(item, source);
    assertEquals("Veg Momos", item.name);
    assertEquals("cat-1", item.categoryId);
    assertEquals(0, item.price.compareTo(new BigDecimal("80")));
    assertEquals("VEG", item.foodType);
    assertTrue(item.sizes.isEmpty());
    assertTrue(item.variants.isEmpty());
    assertEquals(0, item.halfPrice.compareTo(new BigDecimal("40")));
    source.halfPrice = new BigDecimal("50");
    MenuItemDetails.apply(item, source);
    assertEquals(0, item.halfPrice.compareTo(new BigDecimal("50")));
    assertFalse(item.available);
  }

  @Test
  void keepsSizeIdsAndTreatsPriceAsAnIncrement() {
    MenuItemEntity input = input("Paneer Roll", "90");
    SizeOption half = size("size-half", "Half", "0");
    SizeOption large = size(null, "Large", "30");
    input.sizes = List.of(half, large);
    MenuItemEntity item = new MenuItemEntity();
    MenuItemDetails.apply(item, input);
    assertEquals("size-half", item.sizes.get(0).id);
    assertEquals("Half", item.sizes.get(0).name);
    assertEquals(0, item.sizes.get(0).price.compareTo(BigDecimal.ZERO));
    assertEquals("Large", item.sizes.get(1).name);
    assertEquals(0, item.sizes.get(1).price.compareTo(new BigDecimal("30")));
    assertFalse(item.sizes.get(1).id.isBlank());
  }

  @Test
  void storesVariantRulesAndDropsPricesWhenTheyDoNotIncrease() {
    MenuItemEntity input = input("Veg Momos", "80");
    input.variants = List.of(variant("Spice", false, "SINGLE", false, option("Mild", "VEG", "15")), variant("Sauce", true, "multiple", true, option("Schezwan", "non_veg", "10")));
    MenuItemEntity item = new MenuItemEntity();
    MenuItemDetails.apply(item, input);
    assertEquals("SINGLE", item.variants.get(0).selection);
    assertFalse(item.variants.get(0).required);
    assertFalse(item.variants.get(0).priceIncreases);
    assertEquals(0, item.variants.get(0).options.get(0).price.compareTo(BigDecimal.ZERO));
    assertEquals("MULTIPLE", item.variants.get(1).selection);
    assertTrue(item.variants.get(1).required);
    assertEquals("NON_VEG", item.variants.get(1).options.get(0).foodType);
    assertEquals(0, item.variants.get(1).options.get(0).price.compareTo(new BigDecimal("10")));
  }

  @Test
  void rejectsAnIncompleteDish() {
    MenuItemEntity missingImage = input("Veg Momos", "80");
    missingImage.imageUrl = " ";
    assertThrows(IllegalArgumentException.class, () -> MenuItemDetails.apply(new MenuItemEntity(), missingImage));

    MenuItemEntity other = input("Veg Momos", "80");
    other.foodType = "OTHER";
    assertThrows(IllegalArgumentException.class, () -> MenuItemDetails.apply(new MenuItemEntity(), other));

    MenuItemEntity namelessSize = input("Veg Momos", "80");
    namelessSize.sizes = List.of(size(null, " ", "10"));
    assertThrows(IllegalArgumentException.class, () -> MenuItemDetails.apply(new MenuItemEntity(), namelessSize));

    MenuItemEntity priced = input("Veg Momos", "80");
    priced.variants = List.of(variant("Sauce", false, "SINGLE", true, option("Mint", "VEG", null)));
    assertThrows(IllegalArgumentException.class, () -> MenuItemDetails.apply(new MenuItemEntity(), priced));
  }

  private static MenuItemEntity input(String name, String price) {
    MenuItemEntity input = new MenuItemEntity();
    input.name = name;
    input.categoryId = "cat-1";
    input.price = new BigDecimal(price);
    input.foodType = "VEG";
    input.imageUrl = "/uploads/dish.png";
    return input;
  }

  private static SizeOption size(String id, String name, String price) {
    SizeOption size = new SizeOption();
    size.id = id;
    size.name = name;
    size.price = new BigDecimal(price);
    return size;
  }

  private static CustomVariant variant(String name, boolean required, String selection, boolean priceIncreases, VariantOption option) {
    CustomVariant variant = new CustomVariant();
    variant.name = name;
    variant.required = required;
    variant.selection = selection;
    variant.priceIncreases = priceIncreases;
    variant.options = List.of(option);
    return variant;
  }

  private static VariantOption option(String name, String foodType, String price) {
    VariantOption option = new VariantOption();
    option.name = name;
    option.foodType = foodType;
    option.price = price == null ? null : new BigDecimal(price);
    return option;
  }
}
