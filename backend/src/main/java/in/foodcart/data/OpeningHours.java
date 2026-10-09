package in.foodcart.data;

import java.time.DayOfWeek;

/** One weekday's hours, stored on the vendor. "HH:mm" on the half hour. A closing time at or before the opening time ends after midnight. */
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
