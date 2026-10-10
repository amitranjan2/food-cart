package in.foodcart.service;

import in.foodcart.data.VendorEntity;
import in.foodcart.data.VendorLocation;

import java.util.ArrayList;
import java.util.List;

/** Checks and applies what the vendor edits on their profile page. Pure, so it can be unit tested. */
public final class VendorProfile {
  private VendorProfile() {}

  public record Input(String name, String description, String theme, VendorLocation location) {}

  public static void apply(VendorEntity v, Input in) {
    String name = tidy(in.name());
    if (name.length() < 2 || name.length() > 60) throw new IllegalArgumentException("Business name must be 2 to 60 characters.");
    String description = tidy(in.description());
    if (description.length() > 160) throw new IllegalArgumentException("Keep the description under 160 characters.");
    String theme = in.theme() == null ? v.theme : in.theme();
    if (StoreThemes.find(theme).isEmpty()) throw new IllegalArgumentException("Pick one of the colour pairs.");
    v.name = name;
    v.description = description;
    v.theme = theme;
    if (in.location() != null) {
      v.location = location(in.location());
      v.address = address(v.location);
    }
  }

  private static VendorLocation location(VendorLocation in) {
    VendorLocation out = new VendorLocation();
    if (in.lat == null || in.lng == null || in.lat < -90 || in.lat > 90 || in.lng < -180 || in.lng > 180) {
      throw new IllegalArgumentException("Set the stall's location on the map first.");
    }
    out.lat = Math.round(in.lat * 1e6) / 1e6; // ~10 cm; more precision says nothing more about a stall
    out.lng = Math.round(in.lng * 1e6) / 1e6;
    out.shop = limit(in.shop, 60, "Shop / stall number");
    out.landmark = limit(in.landmark, 80, "Landmark");
    out.area = limit(in.area, 160, "Area");
    if (out.area.isEmpty()) throw new IllegalArgumentException("Add the area, street or market name.");
    return out;
  }

  /** The written address customers see: "Shop 12, Near City Mall, Sector 29, Gurugram". */
  static String address(VendorLocation l) {
    List<String> parts = new ArrayList<>();
    for (String part : new String[] {l.shop, l.landmark, l.area}) if (part != null && !part.isEmpty()) parts.add(part);
    return String.join(", ", parts);
  }

  private static String limit(String value, int max, String label) {
    String text = tidy(value);
    if (text.length() > max) throw new IllegalArgumentException(label + " is too long (max " + max + ").");
    return text;
  }

  private static String tidy(String value) {
    return value == null ? "" : value.trim().replaceAll("\\s+", " ");
  }
}
