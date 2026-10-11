package in.foodcart.service.onboarding;

import in.foodcart.data.VendorBusinessEntity;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class BusinessDetailsTest {
  @Test
  void tidiesAndAcceptsValidDetails() {
    VendorBusinessEntity b = new VendorBusinessEntity();
    BusinessDetails.apply(b, new BusinessDetails.Input("1234 5678 9012 34", " abcde1234f ", "bank", null, " Raju  Kumar ", "0012-3456-7890", "sbin0001234"));
    assertEquals("12345678901234", b.fssai);
    assertEquals("ABCDE1234F", b.pan);
    assertEquals("BANK", b.payoutMethod);
    assertEquals("Raju Kumar", b.accountName);
    assertEquals("001234567890", b.accountNumber);
    assertEquals("SBIN0001234", b.ifsc);
    assertTrue(BusinessDetails.complete(b));
  }

  @Test
  void switchingToUpiDropsTheBankAccount() {
    VendorBusinessEntity b = new VendorBusinessEntity();
    BusinessDetails.apply(b, new BusinessDetails.Input(null, null, "BANK", null, "Raju", "001234567890", "SBIN0001234"));
    BusinessDetails.apply(b, new BusinessDetails.Input("12345678901234", "ABCDE1234F", "UPI", "Raju@okaxis", null, null, null));
    assertEquals("raju@okaxis", b.upiId);
    assertNull(b.accountNumber);
    assertTrue(BusinessDetails.complete(b));
  }

  @Test
  void blankFieldsKeepWhatWasSaved() {
    VendorBusinessEntity b = new VendorBusinessEntity();
    BusinessDetails.apply(b, new BusinessDetails.Input("12345678901234", "ABCDE1234F", "BANK", null, "Raju", "001234567890", "SBIN0001234"));
    BusinessDetails.apply(b, new BusinessDetails.Input("", null, "BANK", null, null, "", "HDFC0000123"));
    assertEquals("12345678901234", b.fssai);
    assertEquals("ABCDE1234F", b.pan);
    assertEquals("001234567890", b.accountNumber);
    assertEquals("HDFC0000123", b.ifsc);
  }

  @Test
  void refusesMalformedDetails() {
    VendorBusinessEntity b = new VendorBusinessEntity();
    assertThrows(IllegalArgumentException.class, () -> BusinessDetails.apply(b, new BusinessDetails.Input("12345", null, null, null, null, null, null)));
    assertThrows(IllegalArgumentException.class, () -> BusinessDetails.apply(b, new BusinessDetails.Input(null, "ABC123", null, null, null, null, null)));
    assertThrows(IllegalArgumentException.class, () -> BusinessDetails.apply(b, new BusinessDetails.Input(null, null, "CASH", null, null, null, null)));
    assertThrows(IllegalArgumentException.class, () -> BusinessDetails.apply(b, new BusinessDetails.Input(null, null, "UPI", "raju", null, null, null)));
    assertThrows(IllegalArgumentException.class, () -> BusinessDetails.apply(b, new BusinessDetails.Input(null, null, "BANK", null, "R", null, null)));
    assertThrows(IllegalArgumentException.class, () -> BusinessDetails.apply(b, new BusinessDetails.Input(null, null, "BANK", null, null, "123", null)));
    assertThrows(IllegalArgumentException.class, () -> BusinessDetails.apply(b, new BusinessDetails.Input(null, null, "BANK", null, null, null, "SBIN1001234")));
  }

  @Test
  void maskedViewHidesMostOfPanAndAccount() {
    VendorBusinessEntity b = new VendorBusinessEntity();
    BusinessDetails.apply(b, new BusinessDetails.Input("12345678901234", "ABCDE1234F", "BANK", null, "Raju", "001234567890", "SBIN0001234"));
    Map<String, Object> m = BusinessDetails.masked(b);
    assertEquals("AB•••••34F", m.get("pan"));
    assertEquals("••••7890", m.get("accountNumber"));
    assertFalse(m.toString().contains("ABCDE1234F") || m.toString().contains("001234567890"));
    assertEquals(false, BusinessDetails.masked(null).get("complete"));
  }
}
