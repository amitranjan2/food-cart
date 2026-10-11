package in.foodcart.api;

import in.foodcart.data.VendorEntity;
import in.foodcart.service.StoreLinks;
import in.foodcart.service.SupportRefunds;
import in.foodcart.service.onboarding.SelfOnboarding;
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
  private final SupportRefunds refunds;
  private final SelfOnboarding signups;

  public AdminController(@Value("${ADMIN_TOKEN:}") String token, StoreLinks links, VendorOnboarding onboarding, SupportRefunds refunds, SelfOnboarding signups) {
    this.token = token.length() >= 24 ? token.getBytes(StandardCharsets.UTF_8) : null;
    if (!token.isEmpty() && this.token == null) log.warn("ADMIN_TOKEN is shorter than 24 characters, so the admin API stays off.");
    this.links = links;
    this.onboarding = onboarding;
    this.refunds = refunds;
    this.signups = signups;
  }

  /** null when the caller may go on; otherwise the response to send. */
  private ResponseEntity<Map<String, Object>> refuse(String given) {
    if (token == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "The admin API is off (set ADMIN_TOKEN)."));
    if (given == null || !MessageDigest.isEqual(token, given.getBytes(StandardCharsets.UTF_8))) {
      log.warn("Admin call with a wrong token");
      return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Wrong admin token."));
    }
    return null;
  }

  /** Body: {"name": "...", "mobile": "98…", "slug": "optional-link-name"}. */
  @PostMapping("/vendors")
  public ResponseEntity<Map<String, Object>> createVendor(@RequestHeader(value = "X-Admin-Token", required = false) String given, @RequestBody VendorOnboarding.Request request) {
    ResponseEntity<Map<String, Object>> refused = refuse(given);
    if (refused != null) return refused;
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

  /** An order as support sees it before refunding (ops/refund-order.sh). */
  @GetMapping("/orders")
  public ResponseEntity<Map<String, Object>> order(@RequestHeader(value = "X-Admin-Token", required = false) String given, @RequestParam String slug, @RequestParam long number) {
    ResponseEntity<Map<String, Object>> refused = refuse(given);
    if (refused != null) return refused;
    return ResponseEntity.ok(refunds.describe(slug, number));
  }

  public record Refund(String slug, long orderNumber, String reason) {}

  /** Cancels a paid order the stall can't make and refunds it in full (tracker S3.7). */
  @PostMapping("/orders/refund")
  public ResponseEntity<Map<String, Object>> refund(@RequestHeader(value = "X-Admin-Token", required = false) String given, @RequestBody Refund body) {
    ResponseEntity<Map<String, Object>> refused = refuse(given);
    if (refused != null) return refused;
    Map<String, Object> done = refunds.refund(body.slug(), body.orderNumber(), body.reason());
    log.info("Support refunded order #{} at {}", body.orderNumber(), body.slug());
    return ResponseEntity.ok(done);
  }

  /** Stalls waiting for review, oldest first, with full business details (ops/review-vendors.sh list). */
  @GetMapping("/vendors/review")
  public ResponseEntity<?> waiting(@RequestHeader(value = "X-Admin-Token", required = false) String given) {
    ResponseEntity<Map<String, Object>> refused = refuse(given);
    if (refused != null) return refused;
    return ResponseEntity.ok(signups.waiting());
  }

  public record Review(boolean approve, String note) {}

  /** Approve (the stall goes live and open) or send back with a note the vendor sees. */
  @PostMapping("/vendors/{slug}/review")
  public ResponseEntity<Map<String, Object>> review(@RequestHeader(value = "X-Admin-Token", required = false) String given, @PathVariable String slug, @RequestBody Review body) {
    ResponseEntity<Map<String, Object>> refused = refuse(given);
    if (refused != null) return refused;
    VendorEntity v = signups.review(slug, body.approve(), body.note());
    log.info("Review of {}: {}", v.slug, v.review);
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("slug", v.slug);
    out.put("name", v.name);
    out.put("review", v.review);
    out.put("storeUrl", links.store(v.slug));
    return ResponseEntity.ok(out);
  }
}
