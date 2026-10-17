package in.foodcart.data;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Our tax invoice to a stall for its plan (tracker S4.24): one per DAILY month with charged days, per MONTHLY month,
 * per YEARLY term. The unique index makes the billing run safe to repeat.
 */
@Document("vendorInvoices")
@CompoundIndex(name = "one_per_period", def = "{'vendorId': 1, 'plan': 1, 'periodStart': 1}", unique = true)
public class VendorInvoiceEntity {
  public enum Status { DUE, PAID }

  @Id public String id;
  @Indexed(unique = true) public String number;
  public String vendorId;
  public in.foodcart.domain.VendorPlan plan;
  public LocalDate periodStart;
  public LocalDate periodEnd;
  /** DAILY only: the charged days. */
  public List<LocalDate> chargeDays;
  public int units;
  public BigDecimal unitPrice;
  public BigDecimal taxable;
  public BigDecimal gstPercent;
  public BigDecimal cgst;
  public BigDecimal sgst;
  public BigDecimal total;
  /** The vendor's GSTIN when they gave one, so they can claim the GST as input tax credit. */
  public String vendorGstin;
  public Status status = Status.DUE;
  public Instant issuedAt;
  public LocalDate dueOn;
  public Instant paidAt;
  /** UPI or bank reference the team recorded. */
  public String paymentRef;
}
