package in.foodcart.service.billing;

import in.foodcart.domain.VendorPlan;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Which plan a stall is on in a given month (decided Oct 11). Pure.
 * - Plans run by calendar month. Every stall starts on DAILY.
 * - A switch takes effect on the 1st of the next month, never mid-month.
 * - YEARLY covers the 12 months from its first month; a switch away starts only after them.
 */
public final class PlanRules {
  private PlanRules() {}

  /** From this month on (the 1st), the stall is on this plan. */
  public record Step(VendorPlan plan, YearMonth from) {}

  public static VendorPlan planFor(List<Step> steps, YearMonth month) {
    return steps.stream().filter(s -> !s.from().isAfter(month)).max(Comparator.comparing(Step::from)).map(Step::plan).orElse(VendorPlan.DAILY);
  }

  /** The first month of the yearly term covering this month, if the stall is on YEARLY then. */
  public static YearMonth yearlyStart(List<Step> steps, YearMonth month) {
    if (planFor(steps, month) != VendorPlan.YEARLY) return null;
    YearMonth start = steps.stream().filter(s -> !s.from().isAfter(month)).max(Comparator.comparing(Step::from)).orElseThrow().from();
    // A yearly plan renews by itself: the term containing `month`.
    long terms = (start.until(month, java.time.temporal.ChronoUnit.MONTHS)) / 12;
    return start.plusMonths(terms * 12);
  }

  /** The earliest month a new choice can start, as seen on `today`. */
  public static YearMonth earliestSwitch(List<Step> steps, LocalDate today) {
    YearMonth next = YearMonth.from(today).plusMonths(1);
    YearMonth yearly = yearlyStart(steps, YearMonth.from(today));
    if (yearly != null) {
      YearMonth end = yearly.plusMonths(12);
      if (end.isAfter(next)) return end;
    }
    return next;
  }

  /**
   * The vendor picks a plan on `today`: steps after the earliest switch month are dropped (a change of mind replaces a
   * pending choice), then the new plan is added from that month unless it is already what applies then.
   */
  public static List<Step> choose(List<Step> steps, VendorPlan plan, LocalDate today) {
    YearMonth from = earliestSwitch(steps, today);
    List<Step> next = new ArrayList<>(steps.stream().filter(s -> s.from().isBefore(from)).toList());
    if (planFor(next, from) != plan || (plan == VendorPlan.YEARLY && yearlyStart(next, from) == null)) next.add(new Step(plan, from));
    return next;
  }
}
