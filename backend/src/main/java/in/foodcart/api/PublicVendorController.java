package in.foodcart.api;

import in.foodcart.data.*;
import in.foodcart.domain.VendorStatus;
import in.foodcart.service.PublicMenuView;
import in.foodcart.service.StoreLinks;
import in.foodcart.service.StoreQr;
import in.foodcart.service.slots.SlotRules;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
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
  private final StoreLinks links;

  public PublicVendorController(VendorRepository v, MenuItemRepository i, MenuCategoryRepository c, CatalogCategoryRepository catalog, StoreLinks links) {
    vendors = v;
    items = i;
    categories = c;
    this.catalog = catalog;
    this.links = links;
  }

  // No public list of all vendors: customers reach a vendor through its own link or QR code, and the home page
  // shows only the vendors that customer has opened (/api/customers/me/recent-vendors).

  @GetMapping("/{slug}")
  public ResponseEntity<PublicVendor> vendor(@PathVariable String slug) {
    return vendors.findBySlug(slug).map(PublicVendor::from).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
  }

  /** The store's QR code for the printable poster (/{slug}/qr). It encodes the public store link, not the caller's host. */
  @GetMapping(value = "/{slug}/qr.svg", produces = "image/svg+xml")
  public ResponseEntity<String> qr(@PathVariable String slug) {
    return vendors.findBySlug(slug)
        .map(v -> ResponseEntity.ok().contentType(MediaType.valueOf("image/svg+xml")).cacheControl(CacheControl.maxAge(Duration.ofDays(1)).cachePublic()).body(StoreQr.svg(links.store(v.slug))))
        .orElse(ResponseEntity.notFound().build());
  }

  /** Slots the customer can pick now, in India time ("2026-10-09T14:30"). hoursSet is false until the vendor saves opening hours; open is false while the stall is switched off. */
  @GetMapping("/{slug}/slots")
  public ResponseEntity<Map<String, Object>> slots(@PathVariable String slug) {
    return vendors.findBySlug(slug).map(v -> {
      // A stall switched off in the vendor app offers no slots at all (checkout refuses it too).
      boolean open = v.status == VendorStatus.OPEN;
      List<String> slots = open ? SlotRules.slots(v.openingHours, LocalDateTime.now(SlotRules.ZONE)).stream().map(LocalDateTime::toString).toList() : List.of();
      Map<String, Object> result = new LinkedHashMap<>();
      result.put("open", open);
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
          items.findByVendorIdOrderBySortOrder(v.id),
          v.categoryOrder);
      Map<String, Object> result = new LinkedHashMap<>();
      result.put("categories", menu.categories);
      result.put("items", menu.items);
      return ResponseEntity.ok(result);
    }).orElse(ResponseEntity.notFound().build());
  }
}
