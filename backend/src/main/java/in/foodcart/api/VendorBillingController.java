package in.foodcart.api;

import in.foodcart.domain.VendorPlan;
import in.foodcart.service.AuthService;
import in.foodcart.data.VendorCollectionEntity;
import in.foodcart.data.VendorCollectionRepository;
import in.foodcart.service.billing.VendorBilling;
import in.foodcart.service.billing.VendorCollections;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/** The vendor app's "Plan and billing" screen (tracker S4.24). */
@RestController
@RequestMapping("/api/vendor/me")
public class VendorBillingController {
  private final AuthService auth;
  private final VendorBilling billing;
  private final VendorCollections collections;
  private final VendorCollectionRepository statements;

  public VendorBillingController(AuthService auth, VendorBilling billing, VendorCollections collections, VendorCollectionRepository statements) {
    this.auth = auth;
    this.billing = billing;
    this.collections = collections;
    this.statements = statements;
  }

  @GetMapping("/billing")
  public Map<String, Object> status(@RequestHeader("Authorization") String h) {
    return withCollections(auth.actor(h, "VENDOR"), billing.status(auth.actor(h, "VENDOR")));
  }

  /** Adds the GST-on-cash-orders statements (tracker S2.19); "due" covers both. */
  private Map<String, Object> withCollections(String vendorId, Map<String, Object> out) {
    List<VendorCollectionEntity> list = statements.findByVendorIdOrderByPeriodStartDesc(vendorId);
    out.put("collections", list);
    out.put("collectionThisMonth", collections.thisMonthSoFar(vendorId));
    BigDecimal due = list.stream().filter(s -> s.status == VendorCollectionEntity.Status.DUE).map(s -> s.total).reduce(BigDecimal.ZERO, BigDecimal::add);
    out.put("due", ((BigDecimal) out.get("due")).add(due));
    return out;
  }

  record Choice(VendorPlan plan) {}

  /** Starts on the 1st of next month, or after a running yearly term. */
  @PutMapping("/plan")
  public Map<String, Object> choose(@RequestHeader("Authorization") String h, @RequestBody Choice body) {
    String vendorId = auth.actor(h, "VENDOR");
    return withCollections(vendorId, billing.choose(vendorId, body.plan()));
  }
}
