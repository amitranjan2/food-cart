package in.foodcart.service;

import in.foodcart.data.*;
import in.foodcart.service.onboarding.SelfOnboarding;
import in.foodcart.service.otp.OtpService;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AuthServiceSignupTest {
  private final VendorRepository vendors = mock(VendorRepository.class);
  private final SessionRepository sessions = mock(SessionRepository.class);
  private final OtpService otp = mock(OtpService.class);
  private final SelfOnboarding onboarding = mock(SelfOnboarding.class);
  private final AuthService auth = new AuthService(mock(CustomerRepository.class), vendors, sessions, otp, onboarding);

  @Test
  void aNewNumberGetsACodeAndADraftStallOnlyAfterTheCodeChecksOut() {
    when(vendors.findByMobile("9811122233")).thenReturn(Optional.empty());
    auth.requestOtp("vendor", "9811122233");
    verify(otp).send("VENDOR", "9811122233");

    doThrow(new IllegalArgumentException("Invalid OTP")).when(otp).verify("VENDOR", "9811122233", "000000");
    assertThrows(IllegalArgumentException.class, () -> auth.vendor("9811122233", "000000"));
    verify(onboarding, never()).draftFor(any());

    VendorEntity draft = new VendorEntity();
    draft.id = "v9";
    when(onboarding.draftFor("9811122233")).thenReturn(draft);
    assertNotNull(auth.vendor("9811122233", "123456"));
    verify(sessions).save(argThat(s -> "v9".equals(s.actorId) && "VENDOR".equals(s.role)));
  }

  @Test
  void anExistingStallJustSignsIn() {
    VendorEntity v = new VendorEntity();
    v.id = "v1";
    when(vendors.findByMobile("9999999999")).thenReturn(Optional.of(v));
    auth.vendor("9999999999", "123456");
    verify(onboarding, never()).draftFor(any());
  }
}
