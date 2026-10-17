package in.foodcart.api;

import in.foodcart.service.limits.FixedWindowLimiter;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.*;

class AuthRateLimitsTest {
  private final Clock clock = Clock.fixed(Instant.parse("2026-10-10T10:00:00Z"), ZoneOffset.UTC);

  private static MockHttpServletRequest post(String path, String ip, String forwarded) {
    MockHttpServletRequest request = new MockHttpServletRequest("POST", path);
    request.setRemoteAddr(ip);
    if (forwarded != null) request.addHeader("X-Forwarded-For", forwarded);
    return request;
  }

  private AuthRateLimits limits(boolean trustProxy) {
    return new AuthRateLimits(new FixedWindowLimiter(2, Duration.ofMinutes(10)), new FixedWindowLimiter(3, Duration.ofMinutes(10)), trustProxy, clock);
  }

  @Test
  void requestOtpIsLimitedPerAddressWithA429TheBrowserCanRead() throws Exception {
    AuthRateLimits limits = limits(false);
    assertTrue(limits.preHandle(post("/api/auth/customer/request-otp", "1.2.3.4", null), new MockHttpServletResponse(), null));
    assertTrue(limits.preHandle(post("/api/auth/vendor/request-otp", "1.2.3.4", null), new MockHttpServletResponse(), null));
    MockHttpServletResponse refused = new MockHttpServletResponse();
    assertFalse(limits.preHandle(post("/api/auth/customer/request-otp", "1.2.3.4", null), refused, null));
    assertEquals(429, refused.getStatus());
    assertEquals("600", refused.getHeader("Retry-After"));
    assertTrue(refused.getContentAsString().contains("\"error\""));
    assertTrue(limits.preHandle(post("/api/auth/customer/verify-otp", "1.2.3.4", null), new MockHttpServletResponse(), null), "verify has its own count");
    assertTrue(limits.preHandle(post("/api/auth/customer/request-otp", "9.9.9.9", null), new MockHttpServletResponse(), null));
  }

  @Test
  void forwardedForIsIgnoredUnlessBehindATrustedProxy() throws Exception {
    AuthRateLimits direct = limits(false);
    for (int i = 0; i < 2; i++) direct.preHandle(post("/api/auth/customer/request-otp", "1.2.3.4", "10.0.0." + i), new MockHttpServletResponse(), null);
    assertFalse(direct.preHandle(post("/api/auth/customer/request-otp", "1.2.3.4", "10.0.0.9"), new MockHttpServletResponse(), null), "a fake header must not dodge the limit");

    AuthRateLimits proxied = limits(true);
    assertEquals("203.0.113.7", proxied.clientIp(post("/x", "10.1.1.1", "6.6.6.6, 203.0.113.7")), "the balancer's entry, not the client's claim");
    assertEquals("10.1.1.1", proxied.clientIp(post("/x", "10.1.1.1", null)));
  }

  @Test
  void otherRequestsPassThrough() throws Exception {
    AuthRateLimits limits = limits(false);
    for (int i = 0; i < 5; i++) {
      assertTrue(limits.preHandle(post("/api/auth/logout", "1.2.3.4", null), new MockHttpServletResponse(), null));
      assertTrue(limits.preHandle(new MockHttpServletRequest("OPTIONS", "/api/auth/customer/request-otp"), new MockHttpServletResponse(), null));
    }
  }
}
