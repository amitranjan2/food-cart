package in.foodcart.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class StoreSlugsTest {
  @Test
  void makesALinkNameFromTheBusinessName() {
    assertEquals("rajus-momos-rolls", StoreSlugs.fromName("Raju's Momos & Rolls"));
    assertEquals("cafe-chai", StoreSlugs.fromName("  Café   Chai!! "));
    assertEquals(40, StoreSlugs.fromName("a".repeat(60)).length());
    assertFalse(StoreSlugs.fromName("abcdefghij-".repeat(4) + "x").endsWith("-"), "no trailing hyphen after cutting to 40");
  }

  @Test
  void acceptsNormalLinksAndLowercasesThem() {
    assertEquals("raju-momos", StoreSlugs.check(" Raju-Momos "));
    assertEquals("stall42", StoreSlugs.check("stall42"));
  }

  @Test
  void refusesBadAndReservedLinks() {
    for (String bad : new String[] {"ab", "x".repeat(41), "raju--momos", "-raju", "raju-", "raju_momos", "raju momos", "", null}) {
      assertThrows(IllegalArgumentException.class, () -> StoreSlugs.check(bad), String.valueOf(bad));
    }
    for (String page : new String[] {"terms", "privacy", "refunds", "contact", "admin", "api", "Supr-Mama"}) {
      IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () -> StoreSlugs.check(page));
      assertTrue(e.getMessage().contains("reserved"), e.getMessage());
    }
  }
}
