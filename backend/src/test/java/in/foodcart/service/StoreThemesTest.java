package in.foodcart.service;

import org.junit.jupiter.api.Test;

import java.util.HashSet;

import static org.junit.jupiter.api.Assertions.*;

class StoreThemesTest {
  private static double luminance(String hex) {
    double[] c = new double[3];
    for (int i = 0; i < 3; i++) {
      double v = Integer.parseInt(hex.substring(1 + 2 * i, 3 + 2 * i), 16) / 255.0;
      c[i] = v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  static double contrast(String a, String b) {
    double x = luminance(a), y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }

  @Test
  void everyPairIsReadable() {
    for (StoreThemes.Theme t : StoreThemes.ALL) {
      // dark text on the light header, white text on dark buttons, dark text on white cards (WCAG AA = 4.5)
      assertTrue(contrast(t.dark(), t.light()) >= 7, t.key() + " dark on light " + contrast(t.dark(), t.light()));
      assertTrue(contrast("#FFFFFF", t.dark()) >= 7, t.key() + " white on dark");
      assertTrue(contrast(t.dark(), "#FFFFFF") >= 7, t.key() + " dark on white");
    }
  }

  @Test
  void keysAreUniqueAndUnknownKeysFallBackToTheDefault() {
    assertEquals(StoreThemes.ALL.size(), new HashSet<>(StoreThemes.ALL.stream().map(StoreThemes.Theme::key).toList()).size());
    assertEquals("SKY", StoreThemes.of(null).key());
    assertEquals("SKY", StoreThemes.of("NEON").key());
    assertEquals("MINT", StoreThemes.of("MINT").key());
  }
}
