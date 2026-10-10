package in.foodcart.service;

import in.foodcart.data.VendorEntity;
import in.foodcart.data.VendorRepository;
import in.foodcart.domain.VendorStatus;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import java.time.Instant;

/**
 * Creates a stall account (ops, through AdminController). The vendor then signs in with this mobile number and fills
 * in location, colours and hours in the vendor app; until hours are set, customers can't order.
 */
@Service
public class VendorOnboarding {
  private final VendorRepository vendors;

  public VendorOnboarding(VendorRepository vendors) {
    this.vendors = vendors;
  }

  public record Request(String name, String mobile, String slug) {}

  public VendorEntity create(Request request) {
    String name = request.name() == null ? "" : request.name().trim().replaceAll("\\s+", " ");
    if (name.length() < 2 || name.length() > 60) throw new IllegalArgumentException("Business name must be 2 to 60 characters.");
    String mobile = request.mobile() == null ? "" : request.mobile().trim();
    if (!mobile.matches("[6-9][0-9]{9}")) throw new IllegalArgumentException("Enter the vendor's 10-digit mobile number.");
    String slug = StoreSlugs.check(request.slug() == null || request.slug().isBlank() ? StoreSlugs.fromName(name) : request.slug());
    // Login finds the vendor by mobile, so one number = one stall (tracker S4.9).
    if (vendors.findByMobile(mobile).isPresent()) throw new IllegalStateException("A store already uses " + mobile + ".");
    if (vendors.findBySlug(slug).isPresent()) throw new IllegalStateException("The store link \"" + slug + "\" is taken. Pass another one.");
    VendorEntity v = new VendorEntity();
    v.name = name;
    v.mobile = mobile;
    v.slug = slug;
    v.status = VendorStatus.OPEN;
    v.createdAt = v.updatedAt = Instant.now();
    try {
      return vendors.save(v);
    } catch (DuplicateKeyException race) {
      if (String.valueOf(race.getMessage()).contains("mobile")) throw new IllegalStateException("A store already uses " + mobile + ".");
      throw new IllegalStateException("The store link \"" + slug + "\" is taken. Pass another one.");
    }
  }
}
