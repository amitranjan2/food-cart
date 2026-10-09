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
  void hoursPastMidnightBelongToTheEveningTheyStarted() {
    List<OpeningHours> hours = List.of(new OpeningHours(DayOfWeek.THURSDAY, "18:00", "01:00"));
    // Friday 00:10: Thursday's opening is still running, so 00:30 is still offered.
    assertEquals(List.of(fri("00:30")), SlotRules.slots(hours, fri("00:10")));
  }

  @Test
  void endsAtTheEndOfTomorrowEvenIfTomorrowRunsPastMidnight() {
    List<OpeningHours> hours = List.of(new OpeningHours(DayOfWeek.SATURDAY, "20:00", "01:00"));
    List<LocalDateTime> slots = SlotRules.slots(hours, fri("12:00"));
    assertEquals(LocalDateTime.parse("2026-10-10T23:30"), slots.get(slots.size() - 1)); // not Sunday 00:00/00:30
  }

  @Test
  void tonightsAfterMidnightSlotsAreTomorrowSlots() {
    List<OpeningHours> hours = List.of(new OpeningHours(DayOfWeek.FRIDAY, "20:00", "01:00"));
    List<LocalDateTime> slots = SlotRules.slots(hours, fri("21:10"));
    assertEquals(LocalDateTime.parse("2026-10-10T00:30"), slots.get(slots.size() - 1));
  }

  @Test
  void noHoursMeansNoSlots() {
    assertTrue(SlotRules.slots(List.of(), fri("12:00")).isEmpty());
    assertTrue(SlotRules.slots(null, fri("12:00")).isEmpty());
  }

  @Test
  void validatesVendorInput() {
    assertThrows(IllegalArgumentException.class, () -> SlotRules.validate(List.of(new OpeningHours(DayOfWeek.MONDAY, "09:15", "18:00"))));
    assertThrows(IllegalArgumentException.class, () -> SlotRules.validate(List.of(new OpeningHours(DayOfWeek.MONDAY, "09:00", "09:00"))));
    assertThrows(IllegalArgumentException.class, () -> SlotRules.validate(List.of(new OpeningHours(DayOfWeek.MONDAY, "9am", "18:00"))));
    assertThrows(IllegalArgumentException.class, () -> SlotRules.validate(List.of(
        new OpeningHours(DayOfWeek.MONDAY, "09:00", "18:00"), new OpeningHours(DayOfWeek.MONDAY, "19:00", "20:00"))));
    List<OpeningHours> ok = SlotRules.validate(List.of(new OpeningHours(DayOfWeek.MONDAY, "18:00", "01:30")));
    assertEquals("01:30", ok.get(0).closes);
  }
}
