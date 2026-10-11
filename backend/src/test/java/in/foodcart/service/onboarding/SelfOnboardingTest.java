package in.foodcart.service.onboarding;

import in.foodcart.data.*;
import in.foodcart.domain.VendorReview;
import in.foodcart.domain.VendorStatus;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class SelfOnboardingTest {
  private final VendorRepository vendors = mock(VendorRepository.class);
  private final MenuItemRepository items = mock(MenuItemRepository.class);
  private final VendorBusinessRepository business = mock(VendorBusinessRepository.class);
  private final SelfOnboarding onboarding = new SelfOnboarding(vendors, items, business);
  private VendorEntity draft;

  {
    when(vendors.save(any())).thenAnswer(call -> call.getArgument(0));
    when(vendors.findBySlug(any())).thenReturn(Optional.empty());
    when(business.findById(any())).thenReturn(Optional.empty());
    draft = onboarding.draftFor("9811122233");
    draft.id = "v9";
    when(vendors.findById("v9")).thenReturn(Optional.of(draft));
  }

  @SuppressWarnings("unchecked")
  private static boolean done(Map<String, Object> status, String key) {
    return ((List<OnboardingSteps.Step>) status.get("steps")).stream().filter(s -> s.key().equals(key)).findFirst().orElseThrow().done();
  }

  private void finishRequiredSteps() {
    onboarding.saveBasics("v9", new SelfOnboarding.Basics("Chotu's Chai", null, "MINT"));
    VendorLocation l = new VendorLocation();
    l.lat = 28.4;
    l.lng = 77.0;
    l.area = "Sector 29";
    draft.location = l;
    draft.openingHours.add(new OpeningHours(java.time.DayOfWeek.MONDAY, "08:00", "12:00"));
  }

  @Test
  void aNewNumberGetsAHiddenClosedDraftWithAPlaceholderLink() {
    assertEquals(VendorReview.DRAFT, draft.review);
    assertEquals(VendorStatus.CLOSED, draft.status);
    assertFalse(draft.live());
    assertTrue(draft.slug.startsWith("new-"));
    Map<String, Object> status = onboarding.status("v9");
    assertFalse(done(status, "BASICS"));
    assertEquals(false, status.get("ready"));
  }

  @Test
  void submittingNeedsTheRequiredStepsThenWaitsForTheTeam() {
    assertThrows(IllegalStateException.class, () -> onboarding.submit("v9"));
    finishRequiredSteps();
    assertEquals("chotus-chai", draft.slug);
    assertEquals("MINT", draft.theme);
    Map<String, Object> status = onboarding.submit("v9");
    assertEquals(VendorReview.SUBMITTED, status.get("review"));
    assertNotNull(draft.submittedAt);
    assertFalse(draft.live());
    assertThrows(IllegalStateException.class, () -> onboarding.submit("v9"), "not twice");
  }

  @Test
  void theTeamApprovesOrSendsBackWithANote() {
    finishRequiredSteps();
    onboarding.submit("v9");
    when(vendors.findBySlug("chotus-chai")).thenReturn(Optional.of(draft));
    assertThrows(IllegalArgumentException.class, () -> onboarding.review("chotus-chai", false, "no"));
    onboarding.review("chotus-chai", false, "Add a clear photo of the stall front");
    assertEquals(VendorReview.CHANGES_NEEDED, draft.review);
    assertEquals("Add a clear photo of the stall front", onboarding.status("v9").get("reviewNote"));

    onboarding.submit("v9");
    onboarding.review("chotus-chai", true, null);
    assertEquals(VendorReview.APPROVED, draft.review);
    assertEquals(VendorStatus.OPEN, draft.status);
    assertTrue(draft.live());
    assertThrows(IllegalStateException.class, () -> onboarding.review("chotus-chai", true, null), "only stalls waiting for review");
  }

  @Test
  void theLinkIsCheckedAndFixedOnceLive() {
    when(vendors.findBySlug("raju-momos")).thenReturn(Optional.of(new VendorEntity()));
    assertThrows(IllegalStateException.class, () -> onboarding.saveBasics("v9", new SelfOnboarding.Basics("Raju", "raju-momos", null)), "taken");
    assertThrows(IllegalArgumentException.class, () -> onboarding.saveBasics("v9", new SelfOnboarding.Basics("Raju", "terms", null)), "reserved");
    assertThrows(IllegalArgumentException.class, () -> onboarding.saveBasics("v9", new SelfOnboarding.Basics("Raju", "new-stall", null)), "placeholder prefix");
    assertThrows(IllegalArgumentException.class, () -> onboarding.saveBasics("v9", new SelfOnboarding.Basics("Raju", null, "NEON")), "unknown colours");
    draft.review = VendorReview.APPROVED;
    draft.slug = "chotus-chai";
    assertThrows(IllegalStateException.class, () -> onboarding.saveBasics("v9", new SelfOnboarding.Basics("Chotu", "chotu", null)));
    assertEquals("Chotu's Tea", onboarding.saveBasics("v9", new SelfOnboarding.Basics("Chotu's Tea", "chotus-chai", null)).name, "renaming without moving the link is fine");
  }

  @Test
  void dishesAndBusinessDetailsAreOptionalSteps() {
    when(items.countByVendorIdAndImageUrlNotNull("v9")).thenReturn(1L);
    VendorBusinessEntity b = new VendorBusinessEntity();
    BusinessDetails.apply(b, new BusinessDetails.Input("12345678901234", "ABCDE1234F", "UPI", "chotu@okaxis", null, null, null));
    when(business.findById("v9")).thenReturn(Optional.of(b));
    Map<String, Object> status = onboarding.status("v9");
    assertTrue(done(status, "DISHES"));
    assertTrue(done(status, "BUSINESS"));
    assertEquals(false, status.get("ready"), "still needs the required steps");
  }
}
