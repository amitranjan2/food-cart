package in.foodcart.service;

import in.foodcart.data.MenuItemEntity;
import in.foodcart.data.MenuItemEntity.CustomVariant;
import in.foodcart.data.MenuItemEntity.SizeOption;
import in.foodcart.data.MenuItemEntity.VariantOption;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

public final class MenuItemDetails {
  public static final Set<String> FOOD_TYPES = Set.of("VEG", "NON_VEG", "EGG", "VEGAN");

  private MenuItemDetails() {}

  public static void apply(MenuItemEntity item, MenuItemEntity input) {
    if (input.name == null || input.name.isBlank()) throw new IllegalArgumentException("Add a dish name.");
    item.name = input.name.trim();
    item.categoryId = input.categoryId;
    item.description = input.description == null ? "" : input.description.trim();
    if (input.price == null || input.price.signum() < 0) throw new IllegalArgumentException("Add a valid price.");
    item.price = input.price;
    item.foodType = foodType(input.foodType, "Choose Veg, Non-veg, Egg, or Vegan.");
    if (input.imageUrl == null || input.imageUrl.isBlank()) throw new IllegalArgumentException("Add an image.");
    item.imageUrl = input.imageUrl.trim();
    if (input.halfPrice != null) {
      if (input.halfPrice.signum() < 0) throw new IllegalArgumentException("Add a valid price.");
      item.halfPrice = input.halfPrice;
    }
    item.sizes = sizes(input.sizes);
    item.variants = variants(input.variants);
  }

  public static void present(MenuItemEntity item) {
    if (item.sizes == null) item.sizes = new ArrayList<>();
    if (item.variants == null) item.variants = new ArrayList<>();
    for (CustomVariant variant : item.variants) {
      if (variant.options == null) variant.options = new ArrayList<>();
    }
  }

  private static List<SizeOption> sizes(List<SizeOption> input) {
    if (input == null || input.isEmpty()) return new ArrayList<>();
    List<SizeOption> sizes = new ArrayList<>();
    Set<String> ids = new HashSet<>();
    for (SizeOption source : input) {
      if (source == null || source.name == null || source.name.isBlank()) throw new IllegalArgumentException("Name each size.");
      if (source.price == null || source.price.signum() < 0) throw new IllegalArgumentException("Add a valid price for each size.");
      SizeOption size = new SizeOption();
      size.id = freshId(source.id, ids);
      size.name = source.name.trim();
      size.price = source.price;
      sizes.add(size);
    }
    return sizes;
  }

  private static List<CustomVariant> variants(List<CustomVariant> input) {
    if (input == null || input.isEmpty()) return new ArrayList<>();
    List<CustomVariant> variants = new ArrayList<>();
    Set<String> ids = new HashSet<>();
    for (CustomVariant source : input) {
      if (source == null || source.name == null || source.name.isBlank()) throw new IllegalArgumentException("Name each custom variant.");
      if (source.options == null || source.options.isEmpty()) throw new IllegalArgumentException("Add at least one option to each variant.");
      String selection = source.selection == null ? "" : source.selection.trim().toUpperCase(Locale.ROOT);
      if (!selection.equals("SINGLE") && !selection.equals("MULTIPLE")) throw new IllegalArgumentException("Choose single or multiple for each variant.");
      CustomVariant variant = new CustomVariant();
      variant.id = freshId(source.id, ids);
      variant.name = source.name.trim();
      variant.required = source.required;
      variant.selection = selection;
      variant.priceIncreases = source.priceIncreases;
      variant.options = options(source.options, source.priceIncreases);
      variants.add(variant);
    }
    return variants;
  }

  private static List<VariantOption> options(List<VariantOption> input, boolean priceIncreases) {
    List<VariantOption> options = new ArrayList<>();
    Set<String> ids = new HashSet<>();
    for (VariantOption source : input) {
      if (source == null || source.name == null || source.name.isBlank()) throw new IllegalArgumentException("Name each option.");
      VariantOption option = new VariantOption();
      option.id = freshId(source.id, ids);
      option.name = source.name.trim();
      option.foodType = foodType(source.foodType, "Choose a type for each option.");
      if (!priceIncreases) {
        option.price = BigDecimal.ZERO;
      } else if (source.price == null || source.price.signum() < 0) {
        throw new IllegalArgumentException("Add a valid price for each option.");
      } else {
        option.price = source.price;
      }
      options.add(option);
    }
    return options;
  }

  private static String foodType(String value, String message) {
    if (value == null) throw new IllegalArgumentException(message);
    String normalized = value.trim().toUpperCase(Locale.ROOT);
    if (!FOOD_TYPES.contains(normalized)) throw new IllegalArgumentException(message);
    return normalized;
  }

  private static String freshId(String id, Set<String> used) {
    String trimmed = id == null ? "" : id.trim();
    if (!trimmed.isEmpty() && used.add(trimmed)) return trimmed;
    String generated = UUID.randomUUID().toString();
    used.add(generated);
    return generated;
  }
}
