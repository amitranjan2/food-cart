package in.foodcart.service.slots;

import in.foodcart.data.OpeningHours;

import java.time.*;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.*;

/** Pickup and dine-in time slots. Pure rules, kept free of Spring and Mongo so they can be unit tested. */
public final class SlotRules {
  /** Every vendor is in India for V1. IST has no daylight saving, so slot times never shift. */
  public static final ZoneId ZONE = ZoneId.of("Asia/Kolkata");
  public static final int SLOT_MINUTES = 30;

  private SlotRules() {}

  /** Checks a vendor's weekly hours before saving them. Throws with a message the vendor can act on. */
  public static List<OpeningHours> validate(List<OpeningHours> input) {
    List<OpeningHours> result = new ArrayList<>();
    if (input == null) return result;
    Set<DayOfWeek> seen = EnumSet.noneOf(DayOfWeek.class);
    for (OpeningHours h : input) {
      if (h == null || h.day == null) throw new IllegalArgumentException("Pick a day for each opening time.");
      if (!seen.add(h.day)) throw new IllegalArgumentException(label(h.day) + " is listed twice.");
      LocalTime opens = halfHour(h.opens, h.day);
      LocalTime closes = halfHour(h.closes, h.day);
      if (opens.equals(closes)) throw new IllegalArgumentException(label(h.day) + ": opening and closing time can't be the same.");
      result.add(new OpeningHours(h.day, opens.toString(), closes.toString()));
    }
    result.sort(Comparator.comparing(h -> h.day));
    return result;
  }

  /**
   * Slot start times the customer may pick: every half hour inside opening hours, strictly after the
   * current slot, through the end of tomorrow's opening (including its after-midnight part).
   * A slot starts before closing time, so 10:00-22:00 gives 10:00 ... 21:30.
   */
  public static List<LocalDateTime> slots(List<OpeningHours> hours, LocalDateTime now) {
    if (hours == null || hours.isEmpty()) return List.of();
    LocalDateTime currentSlot = now.truncatedTo(ChronoUnit.HOURS).plusMinutes(now.getMinute() / SLOT_MINUTES * SLOT_MINUTES);
    LocalDate today = now.toLocalDate();
    TreeSet<LocalDateTime> result = new TreeSet<>();
    // Yesterday's opening can still be running after midnight.
    for (LocalDate day = today.minusDays(1); !day.isAfter(today.plusDays(1)); day = day.plusDays(1)) {
      for (OpeningHours h : hours) {
        if (h.day != day.getDayOfWeek()) continue;
        LocalTime opens = LocalTime.parse(h.opens);
        LocalTime closes = LocalTime.parse(h.closes);
        LocalDateTime start = day.atTime(opens);
        LocalDateTime end = closes.isAfter(opens) ? day.atTime(closes) : day.plusDays(1).atTime(closes);
        for (LocalDateTime t = start; t.isBefore(end); t = t.plusMinutes(SLOT_MINUTES)) {
          if (t.isAfter(currentSlot)) result.add(t);
        }
      }
    }
    return new ArrayList<>(result);
  }

  private static LocalTime halfHour(String value, DayOfWeek day) {
    try {
      LocalTime time = LocalTime.parse(value == null ? "" : value);
      if (time.getSecond() == 0 && time.getNano() == 0 && time.getMinute() % SLOT_MINUTES == 0) return time;
    } catch (DateTimeParseException ignored) {
      // fall through to the message below
    }
    throw new IllegalArgumentException(label(day) + ": times must be on the hour or half hour, like 09:00 or 21:30.");
  }

  private static String label(DayOfWeek day) {
    String name = day.name();
    return name.charAt(0) + name.substring(1).toLowerCase();
  }
}
