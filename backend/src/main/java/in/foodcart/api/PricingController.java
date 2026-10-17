package in.foodcart.api;

import in.foodcart.domain.PaymentMethod;
import in.foodcart.service.payments.PaymentService;
import in.foodcart.service.pricing.BillRules;
import in.foodcart.service.pricing.Pricing;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
public class PricingController {
  private final Pricing pricing;
  private final PaymentService payments;

  public PricingController(Pricing pricing, PaymentService payments) {
    this.pricing = pricing;
    this.payments = payments;
  }

  /**
   * The bill's rates in basis points (5% = 500), so the cart does exactly the server's sums (app/lib/bill.ts), and the
   * ways to pay right now. The top-level rates are the online ones; byMethod has each method's.
   */
  @GetMapping("/api/public/pricing")
  public Map<String, Object> rates() {
    BillRules.Rates online = pricing.rates();
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("foodGstBp", online.foodGstBp());
    out.put("platformFeeBp", online.platformFeeBp());
    out.put("platformFeeGstBp", online.platformFeeGstBp());
    List<String> methods = new ArrayList<>();
    if (payments.onlineAvailable()) methods.add(PaymentMethod.ONLINE.name());
    methods.add(PaymentMethod.CASH.name());
    out.put("methods", methods);
    Map<String, BillRules.Rates> byMethod = new LinkedHashMap<>();
    for (PaymentMethod m : PaymentMethod.values()) byMethod.put(m.name(), pricing.rates(m));
    out.put("byMethod", byMethod);
    return out;
  }
}
