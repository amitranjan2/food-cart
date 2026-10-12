package in.foodcart.service.categories;

import in.foodcart.data.CatalogCategoryEntity;
import in.foodcart.data.CatalogCategoryRepository;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Gives every new category an icon in the app's style (tracker S2.20). A vendor adds a category and gets on with their menu; the
 * drawing happens in the background and the storefront shows the generic plate until it is READY. A failed drawing
 * leaves the generic plate (never a broken icon). Drawing costs money, so there is a daily cap.
 */
@Service
public class CategoryIcons {
  public static final String NONE = "NONE", PENDING = "PENDING", READY = "READY", FAILED = "FAILED";
  private static final Logger log = LoggerFactory.getLogger(CategoryIcons.class);
  /** A second try catches a malformed reply; more would only spend more on a name the model can't draw. */
  static final int ATTEMPTS = 2;

  private final CatalogCategoryRepository categories;
  private final IconDrawer drawer;
  private final int dailyCap;
  private final ExecutorService worker = Executors.newFixedThreadPool(2);
  /** Replaced in tests. */
  Clock clock = Clock.systemUTC();

  public CategoryIcons(CatalogCategoryRepository categories, ObjectProvider<IconDrawer> drawers, @Value("${app.category-art.daily-cap:30}") int dailyCap) {
    this.categories = categories;
    this.drawer = drawers.getIfAvailable();
    this.dailyCap = dailyCap;
    if (drawer == null) log.info("Category icons are off (no ANTHROPIC_API_KEY): new categories keep the generic plate.");
  }

  public boolean enabled() {
    return drawer != null;
  }

  /** Draws in the background; returns at once. */
  public void requestAsync(String categoryId) {
    if (drawer == null) return;
    worker.submit(() -> {
      try {
        generate(categoryId, false);
      } catch (RuntimeException e) {
        log.warn("Category icon for {} failed: {}", categoryId, e.toString());
      }
    });
  }

  /** Draws now (tests, and the admin's regenerate). A READY icon is kept unless force. Returns the status after. */
  public String generate(String categoryId, boolean force) {
    if (drawer == null) return NONE;
    CatalogCategoryEntity category = categories.findById(categoryId).orElse(null);
    if (category == null) return NONE;
    if (READY.equals(category.iconStatus) && !force) return READY;
    Instant now = Instant.now(clock);
    if (categories.countByIconRequestedAtAfter(now.minus(Duration.ofDays(1))) >= dailyCap) {
      log.warn("Category icon cap of {} a day reached; \"{}\" keeps the generic plate.", dailyCap, category.name);
      return category.iconStatus == null ? NONE : category.iconStatus;
    }
    category.iconStatus = PENDING;
    category.iconRequestedAt = now;
    category.iconError = null;
    categories.save(category);

    String error = null;
    for (int attempt = 1; attempt <= ATTEMPTS; attempt++) {
      try {
        String svg = CategoryIconSvg.clean(drawer.draw(category.name));
        category.iconSvg = svg;
        category.imageUrl = "/category-art/" + URLEncoder.encode(category.nameKey, StandardCharsets.UTF_8) + ".svg";
        category.iconStatus = READY;
        categories.save(category);
        log.info("Category icon for \"{}\" ready ({} bytes).", category.name, svg.length());
        return READY;
      } catch (Exception e) {
        error = e.getClass().getSimpleName() + ": " + e.getMessage();
        log.warn("Category icon for \"{}\", attempt {}: {}", category.name, attempt, error);
      }
    }
    category.iconStatus = FAILED;
    category.iconError = error == null ? null : error.substring(0, Math.min(error.length(), 200));
    categories.save(category);
    return FAILED;
  }

  /** Takes an icon down (the generic plate comes back); it is not drawn again unless the admin asks. */
  public boolean reject(String nameKey) {
    CatalogCategoryEntity category = categories.findByNameKey(nameKey).orElse(null);
    if (category == null) return false;
    category.iconSvg = null;
    category.imageUrl = null;
    category.iconStatus = NONE;
    categories.save(category);
    return true;
  }

  @PreDestroy
  void stop() {
    worker.shutdownNow();
  }
}
