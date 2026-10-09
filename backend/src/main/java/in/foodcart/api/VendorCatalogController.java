package in.foodcart.api;

import in.foodcart.data.CatalogCategoryEntity;
import in.foodcart.data.CatalogCategoryRepository;
import in.foodcart.service.AuthService;
import in.foodcart.service.categories.CategoryNames;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;

/** Vendors add to the shared category list; anyone can then find and use the new category. */
@RestController
@RequestMapping("/api/vendor/menu/catalog-categories")
public class VendorCatalogController {
  /** Enough for a vendor setting up a menu; stops one account filling the shared list. */
  static final int DAILY_LIMIT = 5;

  private final AuthService auth;
  private final CatalogCategoryRepository categories;

  public VendorCatalogController(AuthService auth, CatalogCategoryRepository categories) {
    this.auth = auth;
    this.categories = categories;
  }

  /** Body: {"name": "..."}. Returns {category, created}; a name that matches an existing category returns that one. */
  @PostMapping
  public Map<String, Object> add(@RequestHeader("Authorization") String header, @RequestBody Map<String, String> body) {
    String vendorId = auth.actor(header, "VENDOR");
    String name = CategoryNames.clean(body.get("name"));
    String key = CategoryNames.key(name);
    var existing = categories.findByNameKey(key);
    if (existing.isPresent()) return Map.of("category", existing.get(), "created", false);
    Instant now = Instant.now();
    if (categories.countByCreatedByVendorIdAndCreatedAtAfter(vendorId, now.minus(Duration.ofDays(1))) >= DAILY_LIMIT) {
      throw new IllegalStateException("You've added " + DAILY_LIMIT + " new categories today. Try again tomorrow.");
    }
    CatalogCategoryEntity category = new CatalogCategoryEntity();
    category.name = name;
    category.nameKey = key;
    category.sortOrder = categories.findAllByOrderBySortOrderAsc().stream().mapToInt(c -> c.sortOrder).max().orElse(-1) + 1;
    category.createdByVendorId = vendorId;
    category.createdAt = now;
    try {
      return Map.of("category", categories.save(category), "created", true);
    } catch (org.springframework.dao.DuplicateKeyException race) {
      // Another vendor added the same name a moment ago.
      return Map.of("category", categories.findByNameKey(key).orElseThrow(), "created", false);
    }
  }
}
