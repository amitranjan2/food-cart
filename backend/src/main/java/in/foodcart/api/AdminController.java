package in.foodcart.api;

import in.foodcart.data.CustomerRepository;
import in.foodcart.data.VendorEntity;
import in.foodcart.service.StoreLinks;
import in.foodcart.service.SupportRefunds;
import in.foodcart.service.onboarding.SelfOnboarding;
import in.foodcart.service.billing.VendorBilling;
import in.foodcart.service.billing.VendorCollections;
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
  private final VendorBilling billing;
  private final VendorCollections collections;
  private final CustomerRepository customers;

  public AdminController(@Value("${ADMIN_TOKEN:}") String token, StoreLinks links, VendorOnboarding onboarding, SupportRefunds refunds, SelfOnboarding signups, VendorBilling billing,
      VendorCollections collections, CustomerRepository customers) {
    this.collections = collections;
    this.customers = customers;
    this.token = token.length() >= 24 ? token.getBytes(StandardCharsets.UTF_8) : null;
    if (!token.isEmpty() && this.token == null) log.warn("ADMIN_TOKEN is shorter than 24 characters, so the admin API stays off.");
    this.links = links;
    this.onboarding = onboarding;
    this.refunds = refunds;
    this.signups = signups;
    this.billing = billing;
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

  /** Issues the invoices due by `date` (default today); the nightly job does the same. Safe to repeat. */
  @PostMapping("/billing/run")
  public ResponseEntity<Map<String, Object>> runBilling(@RequestHeader(value = "X-Admin-Token", required = false) String given, @RequestParam(required = false) String date) {
    ResponseEntity<Map<String, Object>> refused = refuse(given);
    if (refused != null) return refused;
    java.time.LocalDate day = date == null || date.isBlank() ? java.time.LocalDate.now(java.time.ZoneId.of("Asia/Kolkata")) : java.time.LocalDate.parse(date);
    return ResponseEntity.ok(Map.of("date", day.toString(), "issued", billing.run(day), "statements", collections.run(day)));
  }

  @GetMapping("/billing/due")
  public ResponseEntity<?> dueInvoices(@RequestHeader(value = "X-Admin-Token", required = false) String given) {
    ResponseEntity<Map<String, Object>> refused = refuse(given);
    if (refused != null) return refused;
    java.util.List<Map<String, Object>> due = new java.util.ArrayList<>(billing.due());
    due.addAll(collections.due());
    due.sort(java.util.Comparator.comparing(r -> String.valueOf(r.get("dueOn"))));
    return ResponseEntity.ok(due);
  }

  public record Paid(String number, String ref) {}

  /** Records a vendor's UPI or bank payment for an invoice. */
  @PostMapping("/billing/paid")
  public ResponseEntity<Map<String, Object>> paid(@RequestHeader(value = "X-Admin-Token", required = false) String given, @RequestBody Paid body) {
    ResponseEntity<Map<String, Object>> refused = refuse(given);
    if (refused != null) return refused;
    if (body.number() != null && body.number().trim().startsWith("SMC/")) {
      var s = collections.markPaid(body.number(), body.ref());
      log.info("Collection statement {} marked paid", s.number);
      return ResponseEntity.ok(Map.of("number", s.number, "status", s.status, "total", s.total));
    }
    var inv = billing.markPaid(body.number(), body.ref());
    log.info("Vendor invoice {} marked paid", inv.number);
    return ResponseEntity.ok(Map.of("number", inv.number, "status", inv.status, "total", inv.total));
  }

  public record Mobile(String mobile) {}

  /** Turns pay at the stall back on for a number blocked after no-shows (ops/cash-reset.sh). */
  @PostMapping("/customers/cash-reset")
  public ResponseEntity<Map<String, Object>> cashReset(@RequestHeader(value = "X-Admin-Token", required = false) String given, @RequestBody Mobile body) {
    ResponseEntity<Map<String, Object>> refused = refuse(given);
    if (refused != null) return refused;
    String digits = body.mobile() == null ? "" : body.mobile().replaceAll("\\D", "");
    if (digits.length() == 12 && digits.startsWith("91")) digits = digits.substring(2);
    var c = customers.findByMobile(digits).orElseThrow(() -> new IllegalArgumentException("No customer with the number " + body.mobile() + "."));
    int before = c.noShows;
    c.noShows = 0;
    c.updatedAt = java.time.Instant.now();
    customers.save(c);
    log.info("Pay at the stall turned back on for a customer ({} no-shows cleared)", before);
    return ResponseEntity.ok(Map.of("mobile", c.mobile, "noShowsCleared", before));
  }
}
