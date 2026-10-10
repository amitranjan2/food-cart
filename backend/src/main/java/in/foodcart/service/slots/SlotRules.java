package in.foodcart.service.slots;

import in.foodcart.data.OpeningHours;

import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Opening hours and the pickup / dine-in slots they give. Pure rules, kept free of Spring and Mongo so they can be
 * unit tested.
 *
 * Hours are a list of slots per weekday, each inside that calendar day: opens 00:00 … 23:30, closes 00:30 … 24:00
 * ("24:00" = open until midnight). Slots of one day may not overlap; a day with no slots is closed. A stall open
 * 6 PM – 2 AM has Monday 18:00–24:00 and Tuesday 00:00–02:00 (decided Oct 10, replacing "closes after midnight").
 */
public final class SlotRules {
  /** Every vendor is in India for V1. IST has no daylight saving, so slot times never shift. */
  public static final ZoneId ZONE = ZoneId.of("Asia/Kolkata");
  public static final int SLOT_MINUTES = 30;
  public static final int MAX_SLOTS_PER_DAY = 6;
  private static final int DAY_MINUTES = 24 * 60;

  private SlotRules() {}

  /** Checks a vendor's weekly hours before saving them. Throws with a message the vendor can act on. */
  public static List<OpeningHours> validate(List<OpeningHours> input) {
    List<OpeningHours> result = new ArrayList<>();
    if (input == null) return result;
    Map<DayOfWeek, List<int[]>> byDay = new EnumMap<>(DayOfWeek.class);
    for (OpeningHours h : input) {
      if (h == null || h.day == null) throw new IllegalArgumentException("Pick a day for each opening time.");
      int opens = minutes(h.opens, h.day, false);
      int closes = minutes(h.closes, h.day, true);
      if (closes <= opens) {
        throw new IllegalArgumentException(label(h.day) + ": a slot must end after it starts. For hours after midnight, add a slot on the next day from 00:00.");
      }
      byDay.computeIfAbsent(h.day, d -> new ArrayList<>()).add(new int[] {opens, closes});
    }
    for (Map.Entry<DayOfWeek, List<int[]>> day : byDay.entrySet()) {
      List<int[]> slots = day.getValue();
      if (slots.size() > MAX_SLOTS_PER_DAY) throw new IllegalArgumentException(label(day.getKey()) + ": at most " + MAX_SLOTS_PER_DAY + " slots a day.");
      slots.sort(Comparator.comparingInt(s -> s[0]));
      for (int i = 1; i < slots.size(); i++) {
        if (slots.get(i)[0] < slots.get(i - 1)[1]) {
          throw new IllegalArgumentException(label(day.getKey()) + ": slots overlap (" + range(slots.get(i - 1)) + " and " + range(slots.get(i)) + ").");
        }
      }
      for (int[] s : slots) result.add(new OpeningHours(day.getKey(), text(s[0]), text(s[1])));
    }
    return result;
  }

  /**
   * Converts hours saved before Oct 10, when one period could close after midnight (closes at or before opens), into
   * same-day slots: Mon 18:00–02:00 becomes Mon 18:00–24:00 + Tue 00:00–02:00. Overlaps this creates are merged.
   * Returns null when nothing needed changing.
   */
  public static List<OpeningHours> splitAtMidnight(List<OpeningHours> hours) {
    if (hours == null || hours.stream().noneMatch(SlotRules::isLegacy)) return null;
    Map<DayOfWeek, List<int[]>> byDay = new EnumMap<>(DayOfWeek.class);
    for (OpeningHours h : hours) {
      int opens = minutes(h.opens, h.day, false);
      int closes = "24:00".equals(h.closes) ? DAY_MINUTES : minutes(h.closes, h.day, true);
      if (closes > opens) {
        byDay.computeIfAbsent(h.day, d -> new ArrayList<>()).add(new int[] {opens, closes});
      } else {
        byDay.computeIfAbsent(h.day, d -> new ArrayList<>()).add(new int[] {opens, DAY_MINUTES});
        if (closes > 0) byDay.computeIfAbsent(h.day.plus(1), d -> new ArrayList<>()).add(new int[] {0, closes});
      }
    }
    List<OpeningHours> result = new ArrayList<>();
    for (Map.Entry<DayOfWeek, List<int[]>> day : byDay.entrySet()) {
      List<int[]> slots = day.getValue();
      slots.sort(Comparator.comparingInt(s -> s[0]));
      List<int[]> merged = new ArrayList<>();
      for (int[] s : slots) {
        if (!merged.isEmpty() && s[0] <= merged.get(merged.size() - 1)[1]) {
          merged.get(merged.size() - 1)[1] = Math.max(merged.get(merged.size() - 1)[1], s[1]);
        } else {
          merged.add(new int[] {s[0], s[1]});
        }
      }
      for (int[] s : merged) result.add(new OpeningHours(day.getKey(), text(s[0]), text(s[1])));
    }
    return result;
  }

  private static boolean isLegacy(OpeningHours h) {
    return h != null && h.opens != null && h.closes != null && !"24:00".equals(h.closes) && h.closes.compareTo(h.opens) <= 0;
  }

  /**
   * Slot start times the customer may pick: every half hour inside the opening slots, strictly after the current
   * slot, up to the end of tomorrow (11:30 PM tomorrow is the last possible slot). A slot starts before closing time,
   * so 10:00–22:00 gives 10:00 … 21:30, and 18:00–24:00 gives 18:00 … 23:30.
   */
  public static List<LocalDateTime> slots(List<OpeningHours> hours, LocalDateTime now) {
    if (hours == null || hours.isEmpty()) return List.of();
    LocalDateTime currentSlot = now.truncatedTo(ChronoUnit.HOURS).plusMinutes(now.getMinute() / SLOT_MINUTES * SLOT_MINUTES);
    LocalDate today = now.toLocalDate();
    TreeSet<LocalDateTime> result = new TreeSet<>();
    for (LocalDate day = today; !day.isAfter(today.plusDays(1)); day = day.plusDays(1)) {
      for (OpeningHours h : hours) {
        if (h.day != day.getDayOfWeek()) continue;
        LocalDateTime start = day.atStartOfDay().plusMinutes(minutes(h.opens, h.day, false));
        LocalDateTime end = day.atStartOfDay().plusMinutes(minutes(h.closes, h.day, true));
        for (LocalDateTime t = start; t.isBefore(end); t = t.plusMinutes(SLOT_MINUTES)) {
          if (t.isAfter(currentSlot)) result.add(t);
        }
      }
    }
    return new ArrayList<>(result);
  }

  /** "HH:mm" on the half hour → minutes after midnight. "24:00" is allowed only as a closing time. */
  private static int minutes(String value, DayOfWeek day, boolean closing) {
    if (value != null && value.matches("\\d{2}:\\d{2}")) {
      int h = Integer.parseInt(value.substring(0, 2));
      int m = Integer.parseInt(value.substring(3));
      int total = h * 60 + m;
      boolean inDay = closing ? total <= DAY_MINUTES : total < DAY_MINUTES;
      if (m % SLOT_MINUTES == 0 && m < 60 && inDay) return total;
    }
    throw new IllegalArgumentException(label(day) + ": times must be on the hour or half hour, like 09:00 or 21:30"
        + (closing ? " (24:00 for midnight)." : "."));
  }

  private static String text(int minutes) {
    return String.format("%02d:%02d", minutes / 60, minutes % 60);
  }

  /** "09:00–14:00", in the same 24-hour form as the vendor app's hours editor. */
  private static String range(int[] slot) {
    return text(slot[0]) + "–" + text(slot[1]);
  }

  private static String label(DayOfWeek day) {
    String name = day.name();
    return name.charAt(0) + name.substring(1).toLowerCase();
  }
}
