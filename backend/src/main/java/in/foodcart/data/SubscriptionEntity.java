package in.foodcart.data;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * A weekly standing order (tracker S2.21): the same dishes at the same stall on chosen weekdays at one time. Each
 * occurrence becomes an ordinary order 12 hours ahead (Subscriptions); at launch every one is paid at the stall. Weekly
 * UPI mandates (one debit a week) come with online payment.
 */
@Document("subscriptions")
public class SubscriptionEntity {
  public enum Status { ACTIVE, PAUSED, CANCELLED }

  @Id public String id;
  @Indexed public String customerId;
  @Indexed public String vendorId;
  /** PICKUP or DINE_IN. */
  public String type;
  public List<DayOfWeek> days = new ArrayList<>();
  /** The slot's start, "HH:mm" India time, on the half hour. */
  public String time;
  public List<Line> lines = new ArrayList<>();
  public Status status = Status.ACTIVE;
  /** Why it is paused: CUSTOMER, or MISSED when a pickup wasn't collected. */
  public String pauseReason;
  public Instant createdAt;
  /** Occurrences are only placed when the subscription was already active 12 hours before them (set at creation and on resume). */
  public Instant activeFrom;
  public List<LocalDate> skips = new ArrayList<>();
  /** What one order cost when it was set up, as the customer saw it. */
  public BigDecimal quotedTotal;

  public static class Line {
    public String menuItemId;
    public int quantity;
    public String portion;
    public String sizeId;
    public List<Option> options = new ArrayList<>();
  }

  public static class Option {
    public String variantId;
    public List<String> optionIds = new ArrayList<>();

    public Option() {}

    public Option(String variantId, List<String> optionIds) {
      this.variantId = variantId;
      this.optionIds = optionIds;
    }
  }
}
