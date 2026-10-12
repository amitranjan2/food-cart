package in.foodcart.api;

import in.foodcart.data.CatalogCategoryEntity;
import in.foodcart.data.CatalogCategoryRepository;
import in.foodcart.service.categories.CategoryIconSvg;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Optional;

/**
 * Category icons, in the colour of the store showing them: GET /category-art/momos.svg?ink=30404E (six hex digits, the
 * vendor's dark theme colour). The icon is a generated one (stored on the category, CategoryIcons) or a hand-drawn
 * launch icon bundled in static/category-art. Both are line drawings in one ink, so recolouring is a plain swap.
 */
@RestController
public class CategoryArtController {
  private final CatalogCategoryRepository categories;

  public CategoryArtController(CatalogCategoryRepository categories) {
    this.categories = categories;
  }

  @GetMapping(value = "/category-art/{key}.svg", produces = "image/svg+xml")
  public ResponseEntity<String> icon(@PathVariable String key, @RequestParam(required = false) String ink) {
    Optional<String> svg = categories.findByNameKey(key).map(c -> c.iconSvg).filter(s -> s != null && !s.isBlank());
    if (svg.isEmpty() && key.matches("[a-z0-9]{1,40}")) svg = bundled(key);
    if (svg.isEmpty()) return ResponseEntity.notFound().build();
    return ResponseEntity.ok()
        .contentType(MediaType.valueOf("image/svg+xml"))
        .cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePublic())
        // An SVG opened on its own must not run anything.
        .header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'")
        .header("X-Content-Type-Options", "nosniff")
        .body(CategoryIconSvg.withInk(svg.get(), ink));
  }

  private Optional<String> bundled(String key) {
    ClassPathResource file = new ClassPathResource("static/category-art/" + key + ".svg");
    if (!file.exists()) return Optional.empty();
    try (InputStream in = file.getInputStream()) {
      return Optional.of(new String(in.readAllBytes(), StandardCharsets.UTF_8));
    } catch (Exception e) {
      return Optional.empty();
    }
  }
}
