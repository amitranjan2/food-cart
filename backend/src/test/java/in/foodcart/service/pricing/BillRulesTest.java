package in.foodcart.service.pricing;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class BillRulesTest {
  private static final BillRules.Rates LAUNCH = new BillRules.Rates(500, 250, 1800);

  private static void assertBill(String items, String gst, String fee, String feeGst, String total) {
    BillRules.Bill b = BillRules.of(new BigDecimal(items), LAUNCH);
    assertEquals(new BigDecimal(gst), b.foodGst(), "GST on food for " + items);
    assertEquals(new BigDecimal(fee), b.platformFee(), "platform charges for " + items);
    assertEquals(new BigDecimal(feeGst), b.platformFeeGst(), "GST on platform charges for " + items);
    assertEquals(new BigDecimal(total), b.total(), "to pay for " + items);
  }

  @Test
  void launchRatesWorkedExamples() {
    // 80 + 4.00 = 84.00 → 2.5% = 2.10 → 18% = 0.378 → 0.38 → 86.48
    assertBill("80", "4.00", "2.10", "0.38", "86.48");
    // 160 + 8.00 = 168.00 → 4.20 → 0.756 → 0.76 → 172.96
    assertBill("160", "8.00", "4.20", "0.76", "172.96");
    // 99 + 4.95 = 103.95 → 2.59875 → 2.60 → 0.468 → 0.47 → 107.02
    assertBill("99", "4.95", "2.60", "0.47", "107.02");
    // Half-up at exactly half a paisa: 10.10 × 5% = 0.505 → 0.51
    assertBill("10.10", "0.51", "0.27", "0.05", "10.93");
  }

  @Test
  void zeroRatesChargeOnlyTheItems() {
    BillRules.Bill b = BillRules.of(new BigDecimal("150"), new BillRules.Rates(0, 0, 0));
    assertEquals(new BigDecimal("150.00"), b.total());
  }

  @Test
  void gstSplitsIntoCgstAndSgst() {
    BigDecimal[] even = BillRules.split(new BigDecimal("8.00"));
    assertEquals(new BigDecimal("4.00"), even[0]);
    assertEquals(new BigDecimal("4.00"), even[1]);
    BigDecimal[] odd = BillRules.split(new BigDecimal("0.47"));
    assertEquals(new BigDecimal("0.24"), odd[0]);
    assertEquals(new BigDecimal("0.23"), odd[1]);
  }

  @Test
  void configuredPercentagesBecomeBasisPoints() {
    Pricing p = new Pricing(new BigDecimal("5"), new BigDecimal("2.5"), new BigDecimal("18"));
    assertEquals(LAUNCH, p.rates());
  }

  @Test
  void financialYearRunsAprilToMarch() {
    assertEquals("26-27", InvoiceNumbers.financialYear(LocalDate.of(2026, 10, 11)));
    assertEquals("25-26", InvoiceNumbers.financialYear(LocalDate.of(2026, 3, 31)));
    assertEquals("26-27", InvoiceNumbers.financialYear(LocalDate.of(2026, 4, 1)));
    assertEquals("99-00", InvoiceNumbers.financialYear(LocalDate.of(2099, 5, 1)));
  }
}
