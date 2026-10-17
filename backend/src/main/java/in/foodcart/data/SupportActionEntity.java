package in.foodcart.data;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * What support did and why (kept apart from the order, which customers and vendors can read, so internal notes never
 * reach them).
 */
@Document("supportActions")
public class SupportActionEntity {
  @Id public String id;
  public String action;
  public String orderId;
  public String vendorSlug;
  public long orderNumber;
  public BigDecimal amount;
  public String reason;
  public Instant at;
}
