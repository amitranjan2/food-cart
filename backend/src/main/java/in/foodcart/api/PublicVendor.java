package in.foodcart.api;

import in.foodcart.data.VendorEntity;
import in.foodcart.domain.VendorStatus;

/** What anyone on the internet may see about a vendor. Never add the mobile number here. */
public record PublicVendor(
    String id,
    String name,
    String slug,
    String description,
    String address,
    String logoUrl,
    String coverImageUrl,
    String themeColor,
    VendorStatus status) {

  public static PublicVendor from(VendorEntity v) {
    return new PublicVendor(v.id, v.name, v.slug, v.description, v.address, v.logoUrl, v.coverImageUrl, v.themeColor, v.status);
  }
}
