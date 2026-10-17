package in.foodcart.api;

import in.foodcart.data.VendorEntity;
import in.foodcart.service.AuthService;
import in.foodcart.service.onboarding.BusinessDetails;
import in.foodcart.service.onboarding.SelfOnboarding;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** The vendor app's setup checklist (tracker S4.19). */
@RestController
@RequestMapping("/api/vendor/me")
public class VendorOnboardingController {
  private final AuthService auth;
  private final SelfOnboarding onboarding;

  public VendorOnboardingController(AuthService auth, SelfOnboarding onboarding) {
    this.auth = auth;
    this.onboarding = onboarding;
  }

  private String owner(String header) {
    return auth.actor(header, "VENDOR");
  }

  /** {review, reviewNote, steps: [{key, label, required, done}], ready}. */
  @GetMapping("/onboarding")
  public Map<String, Object> status(@RequestHeader("Authorization") String h) {
    return onboarding.status(owner(h));
  }

  @PostMapping("/onboarding/submit")
  public Map<String, Object> submit(@RequestHeader("Authorization") String h) {
    return onboarding.submit(owner(h));
  }

  /** Name, store link (fixed once live) and colour pair. */
  @PutMapping("/basics")
  public VendorEntity basics(@RequestHeader("Authorization") String h, @RequestBody SelfOnboarding.Basics body) {
    return onboarding.saveBasics(owner(h), body);
  }

  /** Masked: PAN and account number are shown only in part. */
  @GetMapping("/business")
  public Map<String, Object> business(@RequestHeader("Authorization") String h) {
    return onboarding.business(owner(h));
  }

  @PutMapping("/business")
  public Map<String, Object> saveBusiness(@RequestHeader("Authorization") String h, @RequestBody BusinessDetails.Input body) {
    return onboarding.saveBusiness(owner(h), body);
  }
}
