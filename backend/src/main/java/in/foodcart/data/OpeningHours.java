package in.foodcart.data;

import java.time.DayOfWeek;

/** One opening slot on a weekday, stored on the vendor. "HH:mm" on the half hour; closes may be "24:00" (midnight). A day can have several; see SlotRules. */
public class OpeningHours {
  public DayOfWeek day;
  public String opens;
  public String closes;

  public OpeningHours() {}

  public OpeningHours(DayOfWeek day, String opens, String closes) {
    this.day = day;
    this.opens = opens;
    this.closes = closes;
  }
}
