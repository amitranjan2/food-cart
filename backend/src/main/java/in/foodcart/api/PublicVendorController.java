package in.foodcart.api;

import in.foodcart.data.*;
import in.foodcart.domain.VendorStatus;
import in.foodcart.service.PublicMenuView;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/public/vendors")
public class PublicVendorController {
  private final VendorRepository vendors;
  private final MenuItemRepository items;
  private final MenuCategoryRepository categories;
  private final CatalogCategoryRepository catalog;

  public PublicVendorController(VendorRepository v, MenuItemRepository i, MenuCategoryRepository c, CatalogCategoryRepository catalog) {
    vendors = v;
    items = i;
    categories = c;
    this.catalog = catalog;
  }

  @GetMapping
  public List<PublicVendor> vendors() {
    return vendors.findByStatusOrderByNameAsc(VendorStatus.OPEN).stream().map(PublicVendor::from).toList();
  }

  @GetMapping("/{slug}")
  public ResponseEntity<PublicVendor> vendor(@PathVariable String slug) {
    return vendors.findBySlug(slug).map(PublicVendor::from).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
  }

  @GetMapping("/{slug}/menu")
  public ResponseEntity<Map<String, Object>> menu(@PathVariable String slug) {
    return vendors.findBySlug(slug).map(v -> {
      PublicMenuView.Result menu = PublicMenuView.assemble(
          catalog.findAllByOrderBySortOrderAsc(),
          categories.findByVendorIdOrderBySortOrder(v.id),
          items.findByVendorIdOrderBySortOrder(v.id));
      Map<String, Object> result = new LinkedHashMap<>();
      result.put("categories", menu.categories);
      result.put("items", menu.items);
      return ResponseEntity.ok(result);
    }).orElse(ResponseEntity.notFound().build());
  }
}
