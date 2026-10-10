package in.foodcart.service.slots;

import in.foodcart.data.OpeningHours;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class SlotRulesTest {
  // 2026-10-09 is a Friday.
  private static LocalDateTime fri(String time) {
    return LocalDateTime.parse("2026-10-09T" + time);
  }

  private static List<OpeningHours> everyDay(String opens, String closes) {
    List<OpeningHours> hours = new ArrayList<>();
    for (DayOfWeek day : DayOfWeek.values()) hours.add(new OpeningHours(day, opens, closes));
    return hours;
  }

  @Test
  void startsAfterTheCurrentSlotAndEndsBeforeClosing() {
    List<LocalDateTime> slots = SlotRules.slots(everyDay("10:00", "22:00"), fri("14:10"));
    assertEquals(fri("14:30"), slots.get(0)); // 14:00-14:30 is the current slot
    assertTrue(slots.contains(fri("21:30")));
    assertFalse(slots.contains(fri("22:00")));
    assertEquals(LocalDateTime.parse("2026-10-10T21:30"), slots.get(slots.size() - 1)); // through tomorrow only
  }

  @Test
  void exactlyOnTheHalfHourSkipsThatSlot() {
    assertEquals(fri("15:00"), SlotRules.slots(everyDay("10:00", "22:00"), fri("14:30")).get(0));
  }

  @Test
  void beforeOpeningTheFirstSlotIsOpeningTime() {
    assertEquals(fri("10:00"), SlotRules.slots(everyDay("10:00", "22:00"), fri("07:45")).get(0));
  }

  @Test
  void usesEachWeekdaysOwnHoursAndSkipsClosedDays() {
    List<OpeningHours> hours = List.of(
        new OpeningHours(DayOfWeek.FRIDAY, "17:00", "19:00"),
        new OpeningHours(DayOfWeek.SUNDAY, "08:00", "09:00")); // Saturday closed
    List<LocalDateTime> slots = SlotRules.slots(hours, fri("12:00"));
    assertEquals(List.of(fri("17:00"), fri("17:30"), fri("18:00"), fri("18:30")), slots);
  }

  @Test
  void severalSlotsADayAndMidnightAsClosingTime() {
    List<OpeningHours> hours = List.of(
        new OpeningHours(DayOfWeek.FRIDAY, "08:00", "09:00"),
        new OpeningHours(DayOfWeek.FRIDAY, "22:00", "24:00"),
        new OpeningHours(DayOfWeek.SATURDAY, "00:00", "01:00"));
    assertEquals(List.of(fri("22:00"), fri("22:30"), fri("23:00"), fri("23:30"),
        LocalDateTime.parse("2026-10-10T00:00"), LocalDateTime.parse("2026-10-10T00:30")), SlotRules.slots(hours, fri("12:00")));
  }

  @Test
  void endsAtTheEndOfTomorrow() {
    List<OpeningHours> hours = new ArrayList<>(everyDay("20:00", "24:00"));
    List<LocalDateTime> slots = SlotRules.slots(hours, fri("12:00"));
    assertEquals(LocalDateTime.parse("2026-10-10T23:30"), slots.get(slots.size() - 1)); // nothing on Sunday
  }

  @Test
  void oldAfterMidnightHoursAreSplitIntoSameDaySlots() {
    List<OpeningHours> split = SlotRules.splitAtMidnight(List.of(
        new OpeningHours(DayOfWeek.MONDAY, "18:00", "02:00"),
        new OpeningHours(DayOfWeek.TUESDAY, "01:00", "03:00"), // overlaps Monday's tail: merged
        new OpeningHours(DayOfWeek.SUNDAY, "20:00", "00:00"))); // until midnight exactly: no Monday part
    assertEquals(List.of("MONDAY 18:00-24:00", "TUESDAY 00:00-03:00", "SUNDAY 20:00-24:00"),
        split.stream().map(h -> h.day + " " + h.opens + "-" + h.closes).toList());
    assertNull(SlotRules.splitAtMidnight(List.of(new OpeningHours(DayOfWeek.MONDAY, "10:00", "24:00"))), "already new: unchanged");
    assertNull(SlotRules.splitAtMidnight(null));
  }

  @Test
  void noHoursMeansNoSlots() {
    assertTrue(SlotRules.slots(List.of(), fri("12:00")).isEmpty());
    assertTrue(SlotRules.slots(null, fri("12:00")).isEmpty());
  }

  @Test
  void validatesVendorInput() {
    for (String[] bad : new String[][] {{"09:15", "18:00"}, {"09:00", "09:00"}, {"9am", "18:00"}, {"18:00", "01:30"}, {"24:00", "24:00"}, {"10:00", "24:30"}}) {
      assertThrows(IllegalArgumentException.class, () -> SlotRules.validate(List.of(new OpeningHours(DayOfWeek.MONDAY, bad[0], bad[1]))), bad[0] + "-" + bad[1]);
    }
    IllegalArgumentException overlap = assertThrows(IllegalArgumentException.class, () -> SlotRules.validate(List.of(
        new OpeningHours(DayOfWeek.MONDAY, "09:00", "14:00"), new OpeningHours(DayOfWeek.MONDAY, "13:00", "17:00"))));
    assertEquals("Monday: slots overlap (09:00–14:00 and 13:00–17:00).", overlap.getMessage());
    List<OpeningHours> tooMany = new ArrayList<>();
    for (int i = 0; i < 7; i++) tooMany.add(new OpeningHours(DayOfWeek.MONDAY, String.format("%02d:00", i * 2), String.format("%02d:00", i * 2 + 1)));
    assertThrows(IllegalArgumentException.class, () -> SlotRules.validate(tooMany));
  }

  @Test
  void validHoursAreSortedByDayThenTime() {
    List<OpeningHours> ok = SlotRules.validate(List.of(
        new OpeningHours(DayOfWeek.TUESDAY, "00:00", "02:00"),
        new OpeningHours(DayOfWeek.MONDAY, "18:00", "24:00"),
        new OpeningHours(DayOfWeek.MONDAY, "08:00", "11:30"),
        new OpeningHours(DayOfWeek.MONDAY, "11:30", "14:00"))); // starts right when the previous ends
    assertEquals(List.of("MONDAY 08:00-11:30", "MONDAY 11:30-14:00", "MONDAY 18:00-24:00", "TUESDAY 00:00-02:00"),
        ok.stream().map(h -> h.day + " " + h.opens + "-" + h.closes).toList());
  }
}
