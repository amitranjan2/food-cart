package in.foodcart.data;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.time.LocalDate;

/**
 * What happened for one subscription on one day. The unique index makes it safe to run the placing job repeatedly and
 * from two servers: only one run can claim a day, so an occurrence never becomes two orders.
 */
@Document("subscriptionRuns")
@CompoundIndex(name = "one_run_per_day", def = "{'subscriptionId': 1, 'date': 1}", unique = true)
public class SubscriptionRunEntity {
  public enum Outcome { CLAIMED, ORDERED, SKIPPED }

  @Id public String id;
  public String subscriptionId;
  public LocalDate date;
  public Outcome outcome = Outcome.CLAIMED;
  public String orderId;
  /** For SKIPPED: what the customer is told ("Raju Momos is switched off."). */
  public String reason;
  public Instant at;
}
