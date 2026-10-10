package in.foodcart.api;

import in.foodcart.data.VendorEntity;
import in.foodcart.service.StoreLinks;
import in.foodcart.service.VendorOnboarding;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Operations for the Supr-Mama team, used by ops/create-vendor.sh. Off unless ADMIN_TOKEN is set (24+ characters); the
 * caller sends it as X-Admin-Token. There is no admin login: keep the token in a password manager.
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {
  private static final Logger log = LoggerFactory.getLogger(AdminController.class);
  private final byte[] token;
  private final StoreLinks links;
  private final VendorOnboarding onboarding;

  public AdminController(@Value("${ADMIN_TOKEN:}") String token, StoreLinks links, VendorOnboarding onboarding) {
    this.token = token.length() >= 24 ? token.getBytes(StandardCharsets.UTF_8) : null;
    if (!token.isEmpty() && this.token == null) log.warn("ADMIN_TOKEN is shorter than 24 characters, so the admin API stays off.");
    this.links = links;
    this.onboarding = onboarding;
  }

  /** Body: {"name": "...", "mobile": "98…", "slug": "optional-link-name"}. */
  @PostMapping("/vendors")
  public ResponseEntity<Map<String, Object>> createVendor(@RequestHeader(value = "X-Admin-Token", required = false) String given, @RequestBody VendorOnboarding.Request request) {
    if (token == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "The admin API is off (set ADMIN_TOKEN)."));
    if (given == null || !MessageDigest.isEqual(token, given.getBytes(StandardCharsets.UTF_8))) {
      log.warn("Admin call with a wrong token");
      return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Wrong admin token."));
    }
    VendorEntity v = onboarding.create(request);
    log.info("Created vendor {} ({})", v.slug, v.id);
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("id", v.id);
    body.put("name", v.name);
    body.put("mobile", v.mobile);
    body.put("slug", v.slug);
    body.put("storeUrl", links.store(v.slug));
    return ResponseEntity.status(HttpStatus.CREATED).body(body);
  }
}
