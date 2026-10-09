package in.foodcart.data;

import java.time.Instant;

/**
 * The code that proves the right person received an order. The customer holds the code; whoever hands the order
 * over (vendor staff today, a delivery partner later) must enter it. Never sent to the party handing over.
 */
public class Handover {
  public String code;
  public int attempts;
  public Instant lockedUntil;
  public Instant verifiedAt;
  /** "VENDOR" today; "DELIVERY_PARTNER" for last-mile delivery later. */
  public String verifiedByRole;
  public String verifiedById;

  /** A copy without the code, for the party handing over. */
  public Handover withoutCode() {
    Handover copy = new Handover();
    copy.attempts = attempts;
    copy.lockedUntil = lockedUntil;
    copy.verifiedAt = verifiedAt;
    copy.verifiedByRole = verifiedByRole;
    copy.verifiedById = verifiedById;
    return copy;
  }
}
