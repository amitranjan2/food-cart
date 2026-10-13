package in.foodcart.service.subscriptions;

import in.foodcart.data.SubscriptionEntity;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

/**
 * When a weekly subscription's orders are placed (tracker S2.21). Pure, so it is unit tested without a clock or a database.
 *
 * An occurrence is a chosen weekday at the chosen time. Its order is placed 12 hours before the slot, so the stall has
 * the morning to prepare, and until then the customer can still skip it. A subscription only places occurrences it
 * was already active for 12 hours before: one set up at 10 am for 12 noon today starts on its next day.
 */
public final class SubscriptionRules {
  private SubscriptionRules() {}

  public static final ZoneId ZONE = ZoneId.of("Asia/Kolkata");
  /** How far ahead of the slot the order is placed (and the customer's last moment to skip it). */
  public static final Duration LEAD = Duration.ofHours(12);
  /** After this, an occurrence that was never placed is counted as missed rather than placed late. */
  public static final Duration LATEST = Duration.ofMinutes(30);

  public record Occurrence(LocalDate date, LocalDateTime slot) {}

  public static LocalDateTime slotOf(LocalDate date, String time) {
    return date.atTime(LocalTime.parse(time));
  }

  /** Whether this day's occurrence belongs to the subscription at all (weekday chosen, active early enough), skipped or not. */
  public static boolean scheduled(SubscriptionEntity s, LocalDate date) {
    if (!s.days.contains(date.getDayOfWeek())) return false;
    LocalDateTime placeAt = slotOf(date, s.time).minus(LEAD);
    LocalDateTime activeFrom = LocalDateTime.ofInstant(s.activeFrom == null ? Instant.EPOCH : s.activeFrom, ZONE);
    return !activeFrom.isAfter(placeAt);
  }

  /** The dates whose order should be placed right now: inside the 12-hour window, not skipped. */
  public static List<LocalDate> due(SubscriptionEntity s, LocalDateTime now) {
    List<LocalDate> dates = new ArrayList<>();
    for (LocalDate date = now.toLocalDate(); !date.isAfter(now.toLocalDate().plusDays(1)); date = date.plusDays(1)) {
      LocalDateTime slot = slotOf(date, s.time);
      boolean inWindow = !now.isBefore(slot.minus(LEAD)) && now.isBefore(slot.minus(LATEST));
      if (inWindow && scheduled(s, date) && !s.skips.contains(date)) dates.add(date);
    }
    return dates;
  }

  /** Dates whose time to place has gone by (so they were missed if there is no record of them). */
  public static List<LocalDate> overdue(SubscriptionEntity s, LocalDateTime now) {
    List<LocalDate> dates = new ArrayList<>();
    for (LocalDate date = now.toLocalDate().minusDays(1); !date.isAfter(now.toLocalDate()); date = date.plusDays(1)) {
      if (!now.isBefore(slotOf(date, s.time).minus(LATEST)) && scheduled(s, date) && !s.skips.contains(date)) dates.add(date);
    }
    return dates;
  }

  /** The next occurrences to show the customer, from three hours ago (a pickup still under way) on. */
  public static List<Occurrence> upcoming(SubscriptionEntity s, LocalDateTime now, int count) {
    List<Occurrence> found = new ArrayList<>();
    for (LocalDate date = now.toLocalDate(); found.size() < count && !date.isAfter(now.toLocalDate().plusDays(14)); date = date.plusDays(1)) {
      LocalDateTime slot = slotOf(date, s.time);
      if (slot.isBefore(now.minusHours(3)) || !scheduled(s, date)) continue;
      found.add(new Occurrence(date, slot));
    }
    return found;
  }

  /** The customer may skip until the order is placed. */
  public static boolean canSkip(LocalDateTime now, LocalDateTime slot) {
    return now.isBefore(slot.minus(LEAD));
  }
}
