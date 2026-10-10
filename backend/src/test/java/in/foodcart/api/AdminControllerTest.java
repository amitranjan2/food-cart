package in.foodcart.api;

import in.foodcart.data.VendorEntity;
import in.foodcart.service.StoreLinks;
import in.foodcart.service.VendorOnboarding;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AdminControllerTest {
  private static final String TOKEN = "t".repeat(32);
  private final VendorOnboarding onboarding = mock(VendorOnboarding.class);
  private final VendorOnboarding.Request request = new VendorOnboarding.Request("Raju Momos", "9876543210", null);

  @Test
  void offWithoutAToken() {
    assertEquals(404, new AdminController("", new StoreLinks("https://suprmama.in"), onboarding).createVendor(TOKEN, request).getStatusCode().value());
    assertEquals(404, new AdminController("short-token", new StoreLinks("https://suprmama.in"), onboarding).createVendor("short-token", request).getStatusCode().value());
    verifyNoInteractions(onboarding);
  }

  @Test
  void wrongOrMissingTokenIsRefused() {
    AdminController admin = new AdminController(TOKEN, new StoreLinks("https://suprmama.in"), onboarding);
    assertEquals(403, admin.createVendor(null, request).getStatusCode().value());
    assertEquals(403, admin.createVendor(TOKEN + "x", request).getStatusCode().value());
    verifyNoInteractions(onboarding);
  }

  @Test
  void createsTheStoreAndReturnsItsLink() {
    VendorEntity v = new VendorEntity();
    v.id = "v1";
    v.name = "Raju Momos";
    v.mobile = "9876543210";
    v.slug = "raju-momos";
    when(onboarding.create(any())).thenReturn(v);
    ResponseEntity<Map<String, Object>> response = new AdminController(TOKEN, new StoreLinks("https://suprmama.in/"), onboarding).createVendor(TOKEN, request);
    assertEquals(201, response.getStatusCode().value());
    assertEquals("https://suprmama.in/raju-momos", response.getBody().get("storeUrl"));
  }
}
