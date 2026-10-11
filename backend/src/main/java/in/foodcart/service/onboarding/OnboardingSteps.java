package in.foodcart.service.onboarding;

import in.foodcart.data.VendorBusinessEntity;
import in.foodcart.data.VendorEntity;
import in.foodcart.service.StoreSlugs;

import java.util.List;

/** The setup checklist, worked out from what the stall has saved (nothing is stored per step). Pure. */
public final class OnboardingSteps {
  private OnboardingSteps() {}

  public record Step(String key, String label, boolean required, boolean done) {}

  public static List<Step> of(VendorEntity v, long dishesWithPhoto, VendorBusinessEntity business) {
    return List.of(
        new Step("BASICS", "Stall name, link and colours", true, v.name != null && !v.name.isBlank() && !StoreSlugs.isPlaceholder(v.slug)),
        new Step("LOCATION", "Stall location", true, v.location != null),
        new Step("HOURS", "Opening hours", true, v.openingHours != null && !v.openingHours.isEmpty()),
        new Step("DISHES", "First dishes, with photos", false, dishesWithPhoto > 0),
        new Step("BUSINESS", "Licence and payout details", false, BusinessDetails.complete(business)));
  }

  /** Every required step is done. */
  public static boolean ready(List<Step> steps) {
    return steps.stream().filter(Step::required).allMatch(Step::done);
  }
}
