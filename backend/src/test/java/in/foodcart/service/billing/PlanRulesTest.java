package in.foodcart.service.billing;

import in.foodcart.domain.VendorPlan;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

import static in.foodcart.domain.VendorPlan.*;
import static org.junit.jupiter.api.Assertions.*;

class PlanRulesTest {
  private static final LocalDate OCT_11 = LocalDate.of(2026, 10, 11);

  @Test
  void everyoneStartsDailyAndASwitchWaitsForNextMonth() {
    assertEquals(DAILY, PlanRules.planFor(List.of(), YearMonth.of(2026, 10)));
    List<PlanRules.Step> steps = PlanRules.choose(List.of(), MONTHLY, OCT_11);
    assertEquals(List.of(new PlanRules.Step(MONTHLY, YearMonth.of(2026, 11))), steps);
    assertEquals(DAILY, PlanRules.planFor(steps, YearMonth.of(2026, 10)), "still daily this month");
    assertEquals(MONTHLY, PlanRules.planFor(steps, YearMonth.of(2027, 3)), "monthly carries on");
  }

  @Test
  void aChangeOfMindReplacesThePendingChoice() {
    List<PlanRules.Step> steps = PlanRules.choose(List.of(), MONTHLY, OCT_11);
    steps = PlanRules.choose(steps, YEARLY, OCT_11.plusDays(3));
    assertEquals(List.of(new PlanRules.Step(YEARLY, YearMonth.of(2026, 11))), steps);
    steps = PlanRules.choose(steps, DAILY, OCT_11.plusDays(5));
    assertEquals(List.of(), steps, "back to what applies anyway: no step needed");
  }

  @Test
  void yearlyLocksTwelveMonthsAndRenews() {
    List<PlanRules.Step> steps = List.of(new PlanRules.Step(YEARLY, YearMonth.of(2026, 11)));
    assertEquals(YearMonth.of(2026, 11), PlanRules.yearlyStart(steps, YearMonth.of(2027, 10)));
    assertEquals(YearMonth.of(2027, 11), PlanRules.yearlyStart(steps, YearMonth.of(2027, 11)), "renews for another term");
    assertEquals(YearMonth.of(2027, 11), PlanRules.earliestSwitch(steps, LocalDate.of(2027, 2, 5)), "can't leave mid-term");
    List<PlanRules.Step> later = PlanRules.choose(steps, MONTHLY, LocalDate.of(2027, 2, 5));
    assertEquals(YEARLY, PlanRules.planFor(later, YearMonth.of(2027, 10)));
    assertEquals(MONTHLY, PlanRules.planFor(later, YearMonth.of(2027, 11)));
  }

  @Test
  void stayingYearlyNeedsNoNewStep() {
    List<PlanRules.Step> steps = List.of(new PlanRules.Step(YEARLY, YearMonth.of(2026, 11)));
    assertEquals(steps, PlanRules.choose(steps, VendorPlan.YEARLY, LocalDate.of(2027, 1, 1)));
  }
}
