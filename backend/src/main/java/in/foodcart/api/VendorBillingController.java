package in.foodcart.api;

import in.foodcart.domain.VendorPlan;
import in.foodcart.service.AuthService;
import in.foodcart.service.billing.VendorBilling;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** The vendor app's "Plan and billing" screen (tracker S4.24). */
@RestController
@RequestMapping("/api/vendor/me")
public class VendorBillingController {
  private final AuthService auth;
  private final VendorBilling billing;

  public VendorBillingController(AuthService auth, VendorBilling billing) {
    this.auth = auth;
    this.billing = billing;
  }

  @GetMapping("/billing")
  public Map<String, Object> status(@RequestHeader("Authorization") String h) {
    return billing.status(auth.actor(h, "VENDOR"));
  }

  record Choice(VendorPlan plan) {}

  /** Starts on the 1st of next month, or after a running yearly term. */
  @PutMapping("/plan")
  public Map<String, Object> choose(@RequestHeader("Authorization") String h, @RequestBody Choice body) {
    return billing.choose(auth.actor(h, "VENDOR"), body.plan());
  }
}
