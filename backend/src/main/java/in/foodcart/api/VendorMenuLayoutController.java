package in.foodcart.api;

import in.foodcart.data.CatalogCategoryEntity;
import in.foodcart.data.CatalogCategoryRepository;
import in.foodcart.data.MenuItemEntity;
import in.foodcart.data.MenuItemRepository;
import in.foodcart.data.VendorEntity;
import in.foodcart.data.VendorRepository;
import in.foodcart.service.AuthService;
import in.foodcart.service.CategoryOrder;
import in.foodcart.service.DishOrder;
import in.foodcart.service.MenuItemDetails;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** How the vendor's menu is laid out in the storefront: category order and the specials carousel. */
@RestController
@RequestMapping("/api/vendor/menu")
public class VendorMenuLayoutController {
  private final AuthService auth;
  private final VendorRepository vendors;
  private final MenuItemRepository items;
  private final CatalogCategoryRepository catalog;

  public VendorMenuLayoutController(AuthService auth, VendorRepository vendors, MenuItemRepository items, CatalogCategoryRepository catalog) {
    this.auth = auth;
    this.vendors = vendors;
    this.items = items;
    this.catalog = catalog;
  }

  /** Body: {"categoryIds": [...]} top to bottom. Returns the saved order. */
  @PutMapping("/category-order")
  public List<String> categoryOrder(@RequestHeader("Authorization") String header, @RequestBody Map<String, List<String>> body) {
    VendorEntity vendor = vendors.findById(auth.actor(header, "VENDOR")).orElseThrow();
    var known = catalog.findAllByOrderBySortOrderAsc().stream().map((CatalogCategoryEntity c) -> c.id).collect(Collectors.toSet());
    vendor.categoryOrder = CategoryOrder.clean(body.get("categoryIds"), known);
    vendor.updatedAt = Instant.now();
    return vendors.save(vendor).categoryOrder;
  }

  /** Body: {"itemIds": [...]}: one category's dishes, top to bottom. */
  @PutMapping("/item-order")
  public void itemOrder(@RequestHeader("Authorization") String header, @RequestBody Map<String, List<String>> body) {
    items.saveAll(DishOrder.apply(items.findByVendorIdOrderBySortOrder(auth.actor(header, "VENDOR")), body.get("itemIds")));
  }

  /** Body: {"special": true|false}. */
  @PatchMapping("/items/{id}/special")
  public MenuItemEntity special(@RequestHeader("Authorization") String header, @PathVariable String id, @RequestBody Map<String, Boolean> body) {
    MenuItemEntity item = items.findByIdAndVendorId(id, auth.actor(header, "VENDOR")).orElseThrow(() -> new SecurityException("Item not found"));
    item.special = Boolean.TRUE.equals(body.get("special"));
    MenuItemEntity saved = items.save(item);
    MenuItemDetails.present(saved);
    return saved;
  }
}
