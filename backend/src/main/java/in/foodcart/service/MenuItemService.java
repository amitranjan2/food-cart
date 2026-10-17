package in.foodcart.service;

import in.foodcart.data.CatalogCategoryEntity;
import in.foodcart.data.CatalogCategoryRepository;
import in.foodcart.data.MenuCategoryRepository;
import in.foodcart.data.MenuItemEntity;
import in.foodcart.data.MenuItemRepository;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
public class MenuItemService {
  private final MenuItemRepository items;
  private final CatalogCategoryRepository categories;
  private final MenuCategoryRepository vendorCategories;

  public MenuItemService(MenuItemRepository items, CatalogCategoryRepository categories, MenuCategoryRepository vendorCategories) {
    this.items = items;
    this.categories = categories;
    this.vendorCategories = vendorCategories;
  }

  public MenuItemEntity create(String vendorId, MenuItemEntity input) {
    MenuItemEntity item = new MenuItemEntity();
    item.vendorId = vendorId;
    item.sortOrder = items.findByVendorIdOrderBySortOrder(vendorId).stream().mapToInt(existing -> existing.sortOrder).max().orElse(-1) + 1;
    write(item, input);
    return items.save(item);
  }

  public MenuItemEntity update(String vendorId, String id, MenuItemEntity input) {
    MenuItemEntity item = items.findByIdAndVendorId(id, vendorId).orElseThrow(() -> new SecurityException("Item not found"));
    write(item, input);
    return items.save(item);
  }

  private void write(MenuItemEntity item, MenuItemEntity input) {
    input.categoryId = catalogCategoryId(input.categoryId);
    if (input.categoryId == null) throw new IllegalArgumentException("Choose a category.");
    MenuItemDetails.apply(item, input);
  }

  private String catalogCategoryId(String categoryId) {
    if (categoryId == null || categoryId.isBlank()) return null;
    if (categories.findById(categoryId).isPresent()) return categoryId;
    String name = vendorCategories.findById(categoryId).map(category -> category.name).orElse(null);
    if (name == null || name.isBlank()) return null;
    String wanted = name.toLowerCase(Locale.ROOT);
    for (CatalogCategoryEntity category : categories.findAllByOrderBySortOrderAsc()) {
      if (category.name != null && category.name.toLowerCase(Locale.ROOT).equals(wanted)) return category.id;
    }
    return null;
  }
}
