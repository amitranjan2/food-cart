package in.foodcart.service;

import in.foodcart.data.MenuItemEntity;
import in.foodcart.data.MenuItemEntity.CustomVariant;
import in.foodcart.data.MenuItemEntity.SizeOption;
import in.foodcart.data.MenuItemEntity.VariantOption;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class MenuLinePrice {
  private MenuLinePrice() {}

  public record Pick(String variantId, List<String> optionIds) {}

  public record Quote(BigDecimal price, String portion, String summary) {}

  public static Quote quote(MenuItemEntity item, String portion, String sizeId, List<Pick> picks) {
    BigDecimal price;
    String storedPortion;
    if (hasSizes(item)) {
      if (sizeId == null || sizeId.isBlank()) throw new IllegalArgumentException("Choose a size.");
      SizeOption size = item.sizes.stream().filter(candidate -> sizeId.equals(candidate.id)).findFirst()
          .orElseThrow(() -> new IllegalArgumentException("Choose a size."));
      if (item.price == null || size.price == null) throw new IllegalArgumentException("Add a valid price.");
      price = item.price.add(size.price);
      storedPortion = size.name;
    } else {
      boolean half = "HALF".equals(portion);
      price = half ? item.halfPrice : item.price;
      storedPortion = half ? "HALF" : "FULL";
    }

    Map<String, List<String>> chosen = new LinkedHashMap<>();
    if (picks != null) {
      for (Pick pick : picks) {
        if (pick == null || pick.variantId() == null || pick.variantId().isBlank()) continue;
        if (chosen.containsKey(pick.variantId())) throw new IllegalArgumentException("An option is no longer available.");
        chosen.put(pick.variantId(), pick.optionIds() == null ? List.of() : pick.optionIds());
      }
    }

    List<String> names = new ArrayList<>();
    Set<String> seenVariants = new HashSet<>();
    for (CustomVariant variant : item.variants == null ? List.<CustomVariant>of() : item.variants) {
      if (variant == null || variant.id == null) continue;
      seenVariants.add(variant.id);
      List<String> optionIds = chosen.getOrDefault(variant.id, List.of());
      if ("SINGLE".equals(variant.selection) && optionIds.size() > 1) {
        throw new IllegalArgumentException("Choose one option for " + variant.name + ".");
      }
      Set<String> unique = new HashSet<>();
      for (String optionId : optionIds) {
        if (optionId == null || !unique.add(optionId)) throw new IllegalArgumentException("An option is no longer available.");
        VariantOption option = findOption(variant, optionId);
        if (option == null) throw new IllegalArgumentException("An option is no longer available.");
        if (variant.priceIncreases && option.price != null && price != null) price = price.add(option.price);
        names.add(option.name);
      }
      if (variant.required && namesFor(variant, optionIds).isEmpty()) {
        throw new IllegalArgumentException("Choose " + variant.name + ".");
      }
    }
    for (String variantId : chosen.keySet()) {
      if (!seenVariants.contains(variantId)) throw new IllegalArgumentException("An option is no longer available.");
    }
    String summary = names.isEmpty() ? null : String.join(", ", names);
    return new Quote(price, storedPortion, summary);
  }

  private static boolean hasSizes(MenuItemEntity item) {
    return item.sizes != null && item.sizes.stream().anyMatch(size -> size != null && size.id != null && !size.id.isBlank());
  }

  private static VariantOption findOption(CustomVariant variant, String optionId) {
    if (variant.options == null) return null;
    for (VariantOption option : variant.options) {
      if (option != null && optionId.equals(option.id)) return option;
    }
    return null;
  }

  private static List<String> namesFor(CustomVariant variant, List<String> optionIds) {
    List<String> names = new ArrayList<>();
    for (String optionId : optionIds) {
      if (findOption(variant, optionId) != null) names.add(optionId);
    }
    return names;
  }
}
