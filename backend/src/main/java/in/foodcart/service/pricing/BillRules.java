package in.foodcart.service.pricing;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * The customer's bill (decided Oct 11, tracker S2.16). Pure, and the storefront's cart does the same sums
 * (app/lib/bill.ts), so both always agree to the paisa:
 *
 *   item total (vendor's prices)
 * + GST on food, 5%: collected and paid by us as the e-commerce operator (CGST Act s.9(5))
 * + platform charges, 2.5% of (item total + GST on food): covers online payment charges
 * + GST on platform charges, 18%: our own service
 * = to pay
 *
 * Money is in paise and rates in basis points (5% = 500), so there is no floating point; each line rounds half up.
 */
public final class BillRules {
  private BillRules() {}

  public record Rates(int foodGstBp, int platformFeeBp, int platformFeeGstBp) {
    public Rates {
      if (foodGstBp < 0 || platformFeeBp < 0 || platformFeeGstBp < 0) throw new IllegalArgumentException("Rates can't be negative");
    }
  }

  public record Bill(BigDecimal itemTotal, BigDecimal foodGst, BigDecimal platformFee, BigDecimal platformFeeGst, BigDecimal total, Rates rates) {}

  public static Bill of(BigDecimal itemTotal, Rates rates) {
    long items = itemTotal.setScale(2, RoundingMode.HALF_UP).movePointRight(2).longValueExact();
    long foodGst = share(items, rates.foodGstBp());
    long fee = share(items + foodGst, rates.platformFeeBp());
    long feeGst = share(fee, rates.platformFeeGstBp());
    return new Bill(rupees(items), rupees(foodGst), rupees(fee), rupees(feeGst), rupees(items + foodGst + fee + feeGst), rates);
  }

  /** CGST and SGST halves of a GST amount (an intra-state supply); an odd paisa goes to CGST. */
  public static BigDecimal[] split(BigDecimal gst) {
    long paise = gst.movePointRight(2).longValueExact();
    long cgst = (paise + 1) / 2;
    return new BigDecimal[] {rupees(cgst), rupees(paise - cgst)};
  }

  /** amount × bp / 10000, rounded half up. */
  static long share(long paise, int bp) {
    return (paise * bp + 5_000) / 10_000;
  }

  private static BigDecimal rupees(long paise) {
    return BigDecimal.valueOf(paise, 2);
  }
}
