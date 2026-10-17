package in.foodcart.service.onboarding;

import in.foodcart.data.*;
import in.foodcart.domain.VendorReview;
import in.foodcart.domain.VendorStatus;
import in.foodcart.service.StoreSlugs;
import in.foodcart.service.StoreThemes;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Vendors sign up themselves (decided Oct 11): the first login with a new number makes a draft stall; the vendor
 * works through the checklist and submits; the team approves (ops/review-vendors.sh). Until then customers can't see
 * the stall.
 */
@Service
public class SelfOnboarding {
  private static final Logger log = LoggerFactory.getLogger(SelfOnboarding.class);
  private final VendorRepository vendors;
  private final MenuItemRepository items;
  private final VendorBusinessRepository business;
  /** Replaced in tests. */
  Clock clock = Clock.systemUTC();

  public SelfOnboarding(VendorRepository vendors, MenuItemRepository items, VendorBusinessRepository business) {
    this.vendors = vendors;
    this.items = items;
    this.business = business;
  }

  /** Called only after the WhatsApp code for this number checked out. */
  public VendorEntity draftFor(String mobile) {
    VendorEntity v = new VendorEntity();
    v.mobile = mobile;
    v.name = "";
    v.slug = StoreSlugs.placeholder();
    v.review = VendorReview.DRAFT;
    v.status = VendorStatus.CLOSED;
    v.createdAt = v.updatedAt = Instant.now(clock);
    try {
      VendorEntity saved = vendors.save(v);
      log.info("New stall sign-up {}", saved.id);
      return saved;
    } catch (DuplicateKeyException sameNumberAtOnce) {
      return vendors.findByMobile(mobile).orElseThrow();
    }
  }

  public record Basics(String name, String slug, String theme) {}

  public VendorEntity saveBasics(String vendorId, Basics in) {
    VendorEntity v = vendors.findById(vendorId).orElseThrow();
    String name = in.name() == null ? "" : in.name().trim().replaceAll("\\s+", " ");
    if (name.length() < 2 || name.length() > 60) throw new IllegalArgumentException("Business name must be 2 to 60 characters.");
    String slug = StoreSlugs.check(in.slug() == null || in.slug().isBlank() ? StoreSlugs.fromName(name) : in.slug());
    if (!slug.equals(v.slug)) {
      // Printed QR codes point at the link, so it is fixed once the stall is live.
      if (v.review == VendorReview.APPROVED) throw new IllegalStateException("Your store link can't change once your stall is live.");
      if (vendors.findBySlug(slug).isPresent()) throw new IllegalStateException("suprmama.in/" + slug + " is taken. Try another link.");
    }
    if (in.theme() != null) v.theme = StoreThemes.find(in.theme()).orElseThrow(() -> new IllegalArgumentException("Pick one of the colour pairs.")).key();
    v.name = name;
    v.slug = slug;
    v.updatedAt = Instant.now(clock);
    try {
      return vendors.save(v);
    } catch (DuplicateKeyException race) {
      throw new IllegalStateException("suprmama.in/" + slug + " is taken. Try another link.");
    }
  }

  public Map<String, Object> business(String vendorId) {
    return BusinessDetails.masked(business.findById(vendorId).orElse(null));
  }

  public Map<String, Object> saveBusiness(String vendorId, BusinessDetails.Input in) {
    VendorBusinessEntity b = business.findById(vendorId).orElseGet(() -> {
      VendorBusinessEntity fresh = new VendorBusinessEntity();
      fresh.id = vendorId;
      return fresh;
    });
    BusinessDetails.apply(b, in);
    b.updatedAt = Instant.now(clock);
    return BusinessDetails.masked(business.save(b));
  }

  public Map<String, Object> status(String vendorId) {
    VendorEntity v = vendors.findById(vendorId).orElseThrow();
    List<OnboardingSteps.Step> steps = steps(v);
    Map<String, Object> view = new LinkedHashMap<>();
    view.put("review", v.review);
    view.put("reviewNote", v.review == VendorReview.CHANGES_NEEDED ? v.reviewNote : null);
    view.put("steps", steps);
    view.put("ready", OnboardingSteps.ready(steps));
    return view;
  }

  public Map<String, Object> submit(String vendorId) {
    VendorEntity v = vendors.findById(vendorId).orElseThrow();
    if (v.review == VendorReview.APPROVED) throw new IllegalStateException("Your stall is already live.");
    if (v.review == VendorReview.SUBMITTED) throw new IllegalStateException("Your stall is already with our team for review.");
    if (!OnboardingSteps.ready(steps(v))) throw new IllegalStateException("Finish the required steps first: name and link, location and opening hours.");
    v.review = VendorReview.SUBMITTED;
    v.submittedAt = v.updatedAt = Instant.now(clock);
    vendors.save(v);
    log.info("Stall {} submitted for review", v.slug);
    return status(vendorId);
  }

  /** Stalls waiting for the team, oldest first, with everything needed to check them (full business details). */
  public List<Map<String, Object>> waiting() {
    return vendors.findByReviewOrderBySubmittedAtAsc(VendorReview.SUBMITTED).stream().map(v -> {
      Map<String, Object> row = new LinkedHashMap<>();
      row.put("slug", v.slug);
      row.put("name", v.name);
      row.put("mobile", v.mobile);
      row.put("address", v.address);
      row.put("submittedAt", v.submittedAt);
      row.put("steps", steps(v));
      row.put("business", business.findById(v.id).orElse(null));
      return row;
    }).toList();
  }

  /** The team's decision. A stall sent back keeps its data; the vendor fixes it and submits again. */
  public VendorEntity review(String slug, boolean approve, String note) {
    VendorEntity v = vendors.findBySlug(slug == null ? "" : slug.trim()).orElseThrow(() -> new IllegalArgumentException("No stall with the link " + slug + "."));
    if (v.review != VendorReview.SUBMITTED) throw new IllegalStateException(v.slug + " isn't waiting for review (it is " + v.review + ").");
    String why = note == null ? "" : note.trim();
    if (!approve && why.length() < 5) throw new IllegalArgumentException("Tell the vendor what to change (5+ characters).");
    v.review = approve ? VendorReview.APPROVED : VendorReview.CHANGES_NEEDED;
    v.reviewNote = approve ? null : why;
    v.reviewedAt = v.updatedAt = Instant.now(clock);
    if (approve) v.status = VendorStatus.OPEN;
    return vendors.save(v);
  }

  private List<OnboardingSteps.Step> steps(VendorEntity v) {
    return OnboardingSteps.of(v, items.countByVendorIdAndImageUrlNotNull(v.id), business.findById(v.id).orElse(null));
  }
}
