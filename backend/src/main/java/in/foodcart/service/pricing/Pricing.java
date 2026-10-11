package in.foodcart.service.pricing;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/** The configured rates (app.pricing.*), in percent in the config and basis points in the sums. */
@Component
public class Pricing {
  private final BillRules.Rates rates;

  public Pricing(@Value("${app.pricing.food-gst-percent:5}") BigDecimal foodGst,
      @Value("${app.pricing.platform-fee-percent:2.5}") BigDecimal platformFee,
      @Value("${app.pricing.platform-fee-gst-percent:18}") BigDecimal platformFeeGst) {
    this.rates = new BillRules.Rates(bp(foodGst), bp(platformFee), bp(platformFeeGst));
  }

  public BillRules.Rates rates() {
    return rates;
  }

  public BillRules.Bill bill(BigDecimal itemTotal) {
    return BillRules.of(itemTotal, rates);
  }

  private static int bp(BigDecimal percent) {
    return percent.movePointRight(2).intValueExact();
  }
}
