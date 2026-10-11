package in.foodcart.api;

import in.foodcart.service.pricing.BillRules;
import in.foodcart.service.pricing.Pricing;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PricingController {
  private final Pricing pricing;

  public PricingController(Pricing pricing) {
    this.pricing = pricing;
  }

  /** The bill's rates in basis points (5% = 500), so the cart does exactly the server's sums (app/lib/bill.ts). */
  @GetMapping("/api/public/pricing")
  public BillRules.Rates rates() {
    return pricing.rates();
  }
}
