package in.foodcart.data;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * A stall's licence and payout details. Kept out of VendorEntity on purpose: vendor documents are returned by many
 * endpoints, these fields only by the onboarding API (masked) and the admin review (full).
 */
@Document("vendorBusiness")
public class VendorBusinessEntity {
  /** The vendor's id. */
  @Id public String id;
  /** FSSAI licence or registration number, 14 digits. */
  public String fssai;
  public String pan;
  /** Optional: GST-registered stalls get it on our invoices for input tax credit. */
  public String gstin;
  /** "UPI" or "BANK". */
  public String payoutMethod;
  public String upiId;
  public String accountName;
  public String accountNumber;
  public String ifsc;
  public Instant updatedAt;
}
