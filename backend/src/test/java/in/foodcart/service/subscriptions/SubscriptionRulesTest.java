package in.foodcart.service.subscriptions;

import in.foodcart.data.SubscriptionEntity;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class SubscriptionRulesTest {
  private static final ZoneId IST = ZoneId.of("Asia/Kolkata");

  // Mon, Wed, Fri at 12:00, active since Sunday 11 October 2026.
  private static SubscriptionEntity weekly() {
    SubscriptionEntity s = new SubscriptionEntity();
    s.days = List.of(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY);
    s.time = "12:00";
    s.activeFrom = LocalDateTime.parse("2026-10-11T09:00").atZone(IST).toInstant();
    return s;
  }

  private static LocalDateTime at(String iso) {
    return LocalDateTime.parse(iso);
  }

  @Test
  void anOrderIsDueTwelveHoursBeforeItsSlotUntilHalfAnHourBefore() {
    SubscriptionEntity s = weekly(); // Monday 12 Oct 2026 is a Monday
    assertEquals(List.of(), SubscriptionRules.due(s, at("2026-10-11T23:59")), "not yet: 12 hours before is midnight");
    assertEquals(List.of(LocalDate.parse("2026-10-12")), SubscriptionRules.due(s, at("2026-10-12T00:00")));
    assertEquals(List.of(LocalDate.parse("2026-10-12")), SubscriptionRules.due(s, at("2026-10-12T11:29")));
    assertEquals(List.of(), SubscriptionRules.due(s, at("2026-10-12T11:30")), "too late to place: counted as missed instead");
  }

  @Test
  void onlyTheChosenWeekdaysCount() {
    SubscriptionEntity s = weekly();
    assertEquals(List.of(), SubscriptionRules.due(s, at("2026-10-13T06:00")), "Tuesday");
    assertEquals(List.of(LocalDate.parse("2026-10-14")), SubscriptionRules.due(s, at("2026-10-14T06:00")), "Wednesday");
  }

  @Test
  void aSubscriptionStartsOnlyAtOccurrencesItWasActiveForTwelveHoursBefore() {
    SubscriptionEntity s = weekly();
    s.activeFrom = at("2026-10-12T10:00").atZone(IST).toInstant(); // set up Monday 10 am for Monday noon
    assertEquals(List.of(), SubscriptionRules.due(s, at("2026-10-12T10:30")), "today's noon is too soon");
    assertFalse(SubscriptionRules.scheduled(s, LocalDate.parse("2026-10-12")));
    assertTrue(SubscriptionRules.scheduled(s, LocalDate.parse("2026-10-14")), "Wednesday is the first one");
    assertEquals(LocalDate.parse("2026-10-14"), SubscriptionRules.upcoming(s, at("2026-10-12T10:30"), 3).get(0).date());
  }

  @Test
  void skippedDatesAreNotDue() {
    SubscriptionEntity s = weekly();
    s.skips = List.of(LocalDate.parse("2026-10-12"));
    assertEquals(List.of(), SubscriptionRules.due(s, at("2026-10-12T06:00")));
    assertEquals(List.of(), SubscriptionRules.overdue(s, at("2026-10-12T20:00")), "a skip is not a miss");
  }

  @Test
  void overdueMeansTheTimeToPlaceHasPassed() {
    SubscriptionEntity s = weekly();
    assertEquals(List.of(), SubscriptionRules.overdue(s, at("2026-10-12T11:29")));
    assertEquals(List.of(LocalDate.parse("2026-10-12")), SubscriptionRules.overdue(s, at("2026-10-12T11:30")));
  }

  @Test
  void upcomingListsTheNextOccurrencesAndKeepsATodayPickupUnderWay() {
    SubscriptionEntity s = weekly();
    List<SubscriptionRules.Occurrence> next = SubscriptionRules.upcoming(s, at("2026-10-12T13:00"), 3);
    assertEquals(List.of("2026-10-12", "2026-10-14", "2026-10-16"), next.stream().map(o -> o.date().toString()).toList(), "Monday noon is within the last 3 hours");
    assertEquals(List.of("2026-10-14", "2026-10-16", "2026-10-19"), SubscriptionRules.upcoming(s, at("2026-10-12T16:00"), 3).stream().map(o -> o.date().toString()).toList());
  }

  @Test
  void skippingIsPossibleOnlyBeforeTheOrderIsPlaced() {
    LocalDateTime slot = at("2026-10-14T12:00");
    assertTrue(SubscriptionRules.canSkip(at("2026-10-13T23:59"), slot));
    assertFalse(SubscriptionRules.canSkip(at("2026-10-14T00:00"), slot));
    assertEquals(Instant.parse("2026-10-14T06:30:00Z"), slot.atZone(IST).toInstant());
  }
}
