package in.foodcart.service;

import in.foodcart.data.CatalogCategoryEntity;
import in.foodcart.data.MenuCategoryEntity;
import in.foodcart.data.MenuItemEntity;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PublicMenuViewTest {
  @Test
  void mergesVendorAndCatalogCategoriesByName() {
    CatalogCategoryEntity momos = catalog("cat-momos", "Momos", 0);
    CatalogCategoryEntity rolls = catalog("cat-rolls", "Rolls", 1);
    CatalogCategoryEntity drinks = catalog("cat-drinks", "Drinks", 2);
    CatalogCategoryEntity chaat = catalog("cat-chaat", "Chaat", 3);
    MenuCategoryEntity vendorRolls = vendor("ven-rolls", "Rolls", 1);
    MenuCategoryEntity vendorMomos = vendor("ven-momos", "Momos", 0);

    MenuItemEntity chicken = item("chicken", "ven-momos");
    MenuItemEntity egg = item("egg", "ven-rolls");
    MenuItemEntity noodles = item("noodles", "cat-rolls");
    MenuItemEntity coffee = item("coffee", "cat-drinks");
    MenuItemEntity loose = item("special", "missing");

    PublicMenuView.Result menu = PublicMenuView.assemble(
        List.of(momos, rolls, drinks, chaat),
        List.of(vendorMomos, vendorRolls),
        List.of(chicken, egg, noodles, coffee, loose));

    assertEquals("ven-momos", chicken.categoryId);
    assertEquals("ven-rolls", egg.categoryId);
    assertEquals(List.of("Momos", "Rolls", "Drinks"), menu.categories.stream().map(category -> category.name).toList());
    assertEquals("cat-momos", menu.items.get(0).categoryId);
    assertEquals("cat-rolls", menu.items.get(1).categoryId);
    assertEquals("cat-rolls", menu.items.get(2).categoryId);
    assertEquals("cat-drinks", menu.items.get(3).categoryId);
    assertEquals("missing", menu.items.get(4).categoryId);
    assertTrue(menu.categories.stream().noneMatch(category -> category.name.equals("Chaat")));
  }

  private static CatalogCategoryEntity catalog(String id, String name, int sortOrder) {
    CatalogCategoryEntity category = new CatalogCategoryEntity();
    category.id = id;
    category.name = name;
    category.sortOrder = sortOrder;
    return category;
  }

  private static MenuCategoryEntity vendor(String id, String name, int sortOrder) {
    MenuCategoryEntity category = new MenuCategoryEntity();
    category.id = id;
    category.name = name;
    category.sortOrder = sortOrder;
    return category;
  }

  private static MenuItemEntity item(String name, String categoryId) {
    MenuItemEntity item = new MenuItemEntity();
    item.name = name;
    item.categoryId = categoryId;
    return item;
  }
}
