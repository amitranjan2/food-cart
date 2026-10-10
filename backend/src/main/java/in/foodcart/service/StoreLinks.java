package in.foodcart.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Public links to a store: what QR codes, posters and the admin API hand out (app.store-url, e.g. https://suprmama.in). */
@Component
public class StoreLinks {
  private final String base;

  public StoreLinks(@Value("${app.store-url}") String base) {
    this.base = base.replaceAll("/+$", "");
  }

  public String store(String slug) {
    return base + "/" + slug;
  }

  /** The printable "Scan to order" page. */
  public String poster(String slug) {
    return store(slug) + "/qr";
  }
}
