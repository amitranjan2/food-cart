package in.foodcart.service;

import java.util.List;
import java.util.Optional;

/**
 * The colour pairs a vendor can pick for their storefront: a light colour for the header and backgrounds and a dark
 * one for text and buttons. A fixed set keeps every storefront readable (StoreThemesTest checks the contrast).
 */
public final class StoreThemes {
  private StoreThemes() {}

  public record Theme(String key, String name, String light, String dark) {}

  public static final String DEFAULT = "SKY";

  public static final List<Theme> ALL = List.of(
      new Theme("SKY", "Sky", "#B3D8FA", "#30404E"),
      new Theme("MINT", "Mint", "#BDE8D2", "#1F4A38"),
      new Theme("PEACH", "Peach", "#FFD3BD", "#6A2F1A"),
      new Theme("LEMON", "Lemon", "#F7E7A1", "#4A3D0E"),
      new Theme("LILAC", "Lilac", "#D8CCF4", "#37295E"),
      new Theme("ROSE", "Rose", "#F8C8D4", "#5E2134"),
      new Theme("SAND", "Sand", "#E9DCC7", "#47372A"),
      new Theme("STONE", "Stone", "#D5DCE3", "#22303D"));

  public static Optional<Theme> find(String key) {
    return ALL.stream().filter(theme -> theme.key().equals(key)).findFirst();
  }

  /** The vendor's theme, or the default for vendors who never picked one. */
  public static Theme of(String key) {
    return find(key).orElseGet(() -> find(DEFAULT).orElseThrow());
  }
}
