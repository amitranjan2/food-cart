package in.foodcart.service;

import in.foodcart.data.*;
import in.foodcart.service.otp.OtpService;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AuthServiceLogoutTest {
  private final SessionRepository sessions = mock(SessionRepository.class);
  private final AuthService auth = new AuthService(mock(CustomerRepository.class), mock(VendorRepository.class), sessions, mock(OtpService.class));

  @Test
  void deletesTheSessionSoItsTokenStopsWorking() {
    SessionEntity session = new SessionEntity();
    session.token = "abc";
    when(sessions.findByToken("abc")).thenReturn(Optional.of(session));
    auth.logout("Bearer abc");
    verify(sessions).delete(session);
  }

  @Test
  void ignoresMissingOrUnknownTokens() {
    when(sessions.findByToken(any())).thenReturn(Optional.empty());
    auth.logout(null);
    auth.logout("Basic xyz");
    auth.logout("Bearer nope");
    verify(sessions, never()).delete(any());
  }
}
