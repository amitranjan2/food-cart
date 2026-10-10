package in.foodcart.service.otp;

import in.foodcart.data.OtpChallengeEntity;
import in.foodcart.data.OtpChallengeRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class OtpServiceTest {
  private final OtpChallengeRepository challenges = mock(OtpChallengeRepository.class);
  private final OtpSender sender = mock(OtpSender.class);

  @SuppressWarnings("unchecked")
  private OtpService service(OtpSender active) {
    ObjectProvider<OtpSender> provider = mock(ObjectProvider.class);
    when(provider.getIfAvailable()).thenReturn(active);
    return new OtpService(challenges, provider);
  }

  @Test
  void refusesToStartWithoutASender() {
    IllegalStateException e = assertThrows(IllegalStateException.class, () -> service(null));
    assertTrue(e.getMessage().contains("WHATSAPP_"), e.getMessage());
  }

  @Test
  void aFailedSendDropsTheCodeAllowsARetryAndStillCounts() {
    OtpChallengeEntity[] saved = new OtpChallengeEntity[1];
    when(challenges.findById("CUSTOMER:9876543210")).thenAnswer(call -> Optional.ofNullable(saved[0]));
    when(challenges.save(any())).thenAnswer(call -> saved[0] = call.getArgument(0));
    doThrow(new IllegalStateException(WhatsAppOtpSender.FAILED)).doNothing().when(sender).send(eq("9876543210"), any());
    OtpService otp = service(sender);

    assertThrows(IllegalStateException.class, () -> otp.send("CUSTOMER", "9876543210"));
    assertNull(saved[0].codeHash, "an undelivered code must not be usable");
    assertNull(saved[0].lastSentAt, "the 30 s resend gap must not block the retry");
    assertEquals(1, saved[0].sendsInWindow);

    otp.send("CUSTOMER", "9876543210"); // retry straight away
    assertNotNull(saved[0].codeHash);
    assertEquals(2, saved[0].sendsInWindow);
  }

  private static String eq(String value) {
    return org.mockito.ArgumentMatchers.eq(value);
  }
}
