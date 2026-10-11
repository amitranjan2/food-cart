package in.foodcart.data;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * What a stall owes us for one month of pay-at-stall orders (tracker S2.19): the 5% GST on food it took in cash from
 * customers. We pay that GST as the e-commerce operator (s.9(5)), so the stall passes it on. Not a tax invoice (the
 * food invoices already exist); a statement, numbered SMC/26-27/000001, due with the plan invoices.
 */
@Document("vendorCollections")
@CompoundIndex(name = "one_per_month", def = "{'vendorId': 1, 'periodStart': 1}", unique = true)
public class VendorCollectionEntity {
  public enum Status { DUE, PAID }

  @Id public String id;
  @Indexed(unique = true) public String number;
  public String vendorId;
  public LocalDate periodStart;
  public LocalDate periodEnd;
  public List<Line> orders = new ArrayList<>();
  public BigDecimal itemTotal;
  public BigDecimal total;
  public Status status = Status.DUE;
  public Instant issuedAt;
  public LocalDate dueOn;
  public Instant paidAt;
  public String paymentRef;

  public static class Line {
    public long orderNumber;
    public LocalDate collectedOn;
    /** The food tax invoice we issued for it. */
    public String invoiceNumber;
    public BigDecimal itemTotal;
    public BigDecimal foodGst;
  }
}
