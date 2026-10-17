package in.foodcart.service;

import in.foodcart.data.VendorEntity;
import in.foodcart.data.VendorLocation;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class VendorProfileTest {
  private static VendorLocation at(String shop, String landmark, String area) {
    VendorLocation l = new VendorLocation();
    l.lat = 28.46912345678;
    l.lng = 77.0716;
    l.shop = shop;
    l.landmark = landmark;
    l.area = area;
    return l;
  }

  @Test
  void savesNameThemeAndLocationAndWritesTheAddress() {
    VendorEntity v = new VendorEntity();
    v.logoUrl = "/uploads/logo.png";
    VendorProfile.apply(v, new VendorProfile.Input("  Raju   Momos ", "Momos", "MINT", at("Stall 4", " Near City Mall ", "Sector 29, Gurugram")));
    assertEquals("Raju Momos", v.name);
    assertEquals("MINT", v.theme);
    assertEquals("Stall 4, Near City Mall, Sector 29, Gurugram", v.address);
    assertEquals(28.469123, v.location.lat);
    assertEquals("/uploads/logo.png", v.logoUrl, "logo is not part of this form");
  }

  @Test
  void withoutALocationTheOldAddressStays() {
    VendorEntity v = new VendorEntity();
    v.address = "Outside City Mall";
    VendorProfile.apply(v, new VendorProfile.Input("Raju Momos", null, null, null));
    assertEquals("Outside City Mall", v.address);
    assertEquals(StoreThemes.DEFAULT, v.theme);
  }

  @Test
  void refusesBadInput() {
    VendorEntity v = new VendorEntity();
    assertThrows(IllegalArgumentException.class, () -> VendorProfile.apply(v, new VendorProfile.Input("R", null, null, null)));
    assertThrows(IllegalArgumentException.class, () -> VendorProfile.apply(v, new VendorProfile.Input("Raju", null, "NEON", null)));
    VendorLocation noPoint = at("1", "", "Sector 29");
    noPoint.lat = null;
    assertThrows(IllegalArgumentException.class, () -> VendorProfile.apply(v, new VendorProfile.Input("Raju", null, null, noPoint)));
    assertThrows(IllegalArgumentException.class, () -> VendorProfile.apply(v, new VendorProfile.Input("Raju", null, null, at("1", "", " "))));
    assertThrows(IllegalArgumentException.class, () -> VendorProfile.apply(v, new VendorProfile.Input("Raju", "x".repeat(161), null, null)));
  }
}
