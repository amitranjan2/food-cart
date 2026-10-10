package in.foodcart.api;

import in.foodcart.data.VendorEntity;
import in.foodcart.domain.VendorStatus;
import in.foodcart.service.StoreThemes;

/** What anyone on the internet may see about a vendor. Never add the mobile number here. */
public record PublicVendor(
    String id,
    String name,
    String slug,
    String description,
    String address,
    String logoUrl,
    String coverImageUrl,
    StoreThemes.Theme theme,
    /** The stall's GPS point for "Directions"; null until the vendor sets it. */
    Double lat,
    Double lng,
    VendorStatus status) {

  public static PublicVendor from(VendorEntity v) {
    Double lat = v.location == null ? null : v.location.lat;
    Double lng = v.location == null ? null : v.location.lng;
    return new PublicVendor(v.id, v.name, v.slug, v.description, v.address, v.logoUrl, v.coverImageUrl, StoreThemes.of(v.theme), lat, lng, v.status);
  }
}
