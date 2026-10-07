package in.foodcart.service;

import in.foodcart.data.CatalogCategoryEntity;
import in.foodcart.data.MenuCategoryEntity;
import in.foodcart.data.MenuItemEntity;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Public menu categories are merged by name for this response only.
 * A catalogue category wins over a vendor category with the same name.
 */
public final class PublicMenuView {
  private PublicMenuView() {}

  public static Result assemble(
      List<CatalogCategoryEntity> catalog,
      List<MenuCategoryEntity> vendorCategories,
      List<MenuItemEntity> items) {
    Map<String, Category> byName = new LinkedHashMap<>();
    for (CatalogCategoryEntity category : catalog == null ? List.<CatalogCategoryEntity>of() : catalog) {
      String key = key(category == null ? null : category.name);
      if (key == null || category.id == null) continue;
      byName.putIfAbsent(key, category(category.id, category.name, category.sortOrder, category.imageUrl));
    }
    for (MenuCategoryEntity category : vendorCategories == null ? List.<MenuCategoryEntity>of() : vendorCategories) {
      String key = key(category == null ? null : category.name);
      if (key == null || category.id == null) continue;
      byName.putIfAbsent(key, category(category.id, category.name, category.sortOrder, null));
    }

    Map<String, Category> byId = new HashMap<>();
    if (catalog != null) {
      for (CatalogCategoryEntity category : catalog) {
        String key = key(category == null ? null : category.name);
        if (category != null && category.id != null && key != null) byId.put(category.id, byName.get(key));
      }
    }
    if (vendorCategories != null) {
      for (MenuCategoryEntity category : vendorCategories) {
        String key = key(category == null ? null : category.name);
        if (category != null && category.id != null && key != null) byId.put(category.id, byName.get(key));
      }
    }

    Map<String, Category> used = new LinkedHashMap<>();
    List<MenuItemEntity> copies = new ArrayList<>();
    for (MenuItemEntity source : items == null ? List.<MenuItemEntity>of() : items) {
      MenuItemEntity copy = copy(source);
      Category category = source.categoryId == null ? null : byId.get(source.categoryId);
      if (category != null) {
        copy.categoryId = category.id;
        used.putIfAbsent(category.id, category);
      }
      copies.add(copy);
    }

    List<Category> categories = new ArrayList<>(used.values());
    categories.sort(Comparator.comparingInt((Category category) -> category.sortOrder).thenComparing(category -> category.name, String.CASE_INSENSITIVE_ORDER));
    Result result = new Result();
    result.categories = categories;
    result.items = copies;
    return result;
  }

  private static MenuItemEntity copy(MenuItemEntity source) {
    MenuItemEntity item = new MenuItemEntity();
    item.id = source.id;
    item.vendorId = source.vendorId;
    item.categoryId = source.categoryId;
    item.name = source.name;
    item.description = source.description;
    item.imageUrl = source.imageUrl;
    item.foodType = source.foodType;
    item.price = source.price;
    item.halfPrice = source.halfPrice;
    item.active = source.active;
    item.available = source.available;
    item.halfAvailable = source.halfAvailable;
    item.sortOrder = source.sortOrder;
    item.sizes = source.sizes;
    item.variants = source.variants;
    return item;
  }

  private static Category category(String id, String name, int sortOrder, String imageUrl) {
    Category category = new Category();
    category.id = id;
    category.name = name.trim();
    category.sortOrder = sortOrder;
    category.imageUrl = imageUrl;
    return category;
  }

  private static String key(String name) {
    if (name == null || name.isBlank()) return null;
    return name.trim().toLowerCase(Locale.ROOT);
  }

  public static class Result {
    public List<Category> categories;
    public List<MenuItemEntity> items;
  }

  public static class Category {
    public String id;
    public String name;
    public String imageUrl;
    public int sortOrder;
  }
}
