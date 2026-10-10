package in.foodcart.service;

import in.foodcart.data.VendorEntity;
import in.foodcart.data.VendorRepository;
import in.foodcart.domain.VendorStatus;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DuplicateKeyException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class VendorOnboardingTest {
  private final VendorRepository vendors = mock(VendorRepository.class);
  private final VendorOnboarding onboarding = new VendorOnboarding(vendors);

  {
    when(vendors.findByMobile(any())).thenReturn(Optional.empty());
    when(vendors.findBySlug(any())).thenReturn(Optional.empty());
    when(vendors.save(any())).thenAnswer(call -> call.getArgument(0));
  }

  @Test
  void createsAnOpenStoreWithALinkFromTheName() {
    VendorEntity v = onboarding.create(new VendorOnboarding.Request("  Raju's   Momos ", " 9876543210 ", null));
    assertEquals("Raju's Momos", v.name);
    assertEquals("9876543210", v.mobile);
    assertEquals("rajus-momos", v.slug);
    assertEquals(VendorStatus.OPEN, v.status);
    assertNotNull(v.createdAt);
  }

  @Test
  void usesTheGivenLink() {
    assertEquals("raju-sector-29", onboarding.create(new VendorOnboarding.Request("Raju's Momos", "9876543210", "Raju-Sector-29")).slug);
  }

  @Test
  void refusesBadInput() {
    assertThrows(IllegalArgumentException.class, () -> onboarding.create(new VendorOnboarding.Request("R", "9876543210", null)));
    assertThrows(IllegalArgumentException.class, () -> onboarding.create(new VendorOnboarding.Request("Raju", "5876543210", null)));
    assertThrows(IllegalArgumentException.class, () -> onboarding.create(new VendorOnboarding.Request("Raju", "98765", null)));
    assertThrows(IllegalArgumentException.class, () -> onboarding.create(new VendorOnboarding.Request("Raju", "9876543210", "terms")));
    verify(vendors, never()).save(any());
  }

  @Test
  void oneMobileNumberPerStore() {
    when(vendors.findByMobile("9876543210")).thenReturn(Optional.of(new VendorEntity()));
    IllegalStateException e = assertThrows(IllegalStateException.class, () -> onboarding.create(new VendorOnboarding.Request("Raju", "9876543210", null)));
    assertTrue(e.getMessage().contains("9876543210"));
    verify(vendors, never()).save(any());
  }

  @Test
  void takenLinkIsRefusedIncludingARace() {
    when(vendors.findBySlug("raju-momos")).thenReturn(Optional.of(new VendorEntity()));
    assertThrows(IllegalStateException.class, () -> onboarding.create(new VendorOnboarding.Request("Raju Momos", "9876543210", null)));

    when(vendors.findBySlug("raju-momos")).thenReturn(Optional.empty());
    when(vendors.save(any())).thenThrow(new DuplicateKeyException("slug"));
    IllegalStateException e = assertThrows(IllegalStateException.class, () -> onboarding.create(new VendorOnboarding.Request("Raju Momos", "9876543210", null)));
    assertTrue(e.getMessage().contains("taken"));
  }
}
