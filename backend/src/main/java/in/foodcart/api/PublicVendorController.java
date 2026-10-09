package in.foodcart.api;

import in.foodcart.data.*;
import in.foodcart.service.PublicMenuView;
import in.foodcart.service.slots.SlotRules;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
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

  // No public list of all vendors: customers reach a vendor through its own link or QR code, and the home page
  // shows only the vendors that customer has opened (/api/customers/me/recent-vendors).

  @GetMapping("/{slug}")
  public ResponseEntity<PublicVendor> vendor(@PathVariable String slug) {
    return vendors.findBySlug(slug).map(PublicVendor::from).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
  }

  /** Slots the customer can pick now, in India time ("2026-10-09T14:30"). hoursSet is false until the vendor saves opening hours. */
  @GetMapping("/{slug}/slots")
  public ResponseEntity<Map<String, Object>> slots(@PathVariable String slug) {
    return vendors.findBySlug(slug).map(v -> {
      List<String> slots = SlotRules.slots(v.openingHours, LocalDateTime.now(SlotRules.ZONE)).stream().map(LocalDateTime::toString).toList();
      Map<String, Object> result = new LinkedHashMap<>();
      result.put("hoursSet", v.openingHours != null && !v.openingHours.isEmpty());
      result.put("slots", slots);
      return ResponseEntity.ok(result);
    }).orElse(ResponseEntity.notFound().build());
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
