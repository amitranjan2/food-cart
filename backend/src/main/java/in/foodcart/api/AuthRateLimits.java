package in.foodcart.api;

import in.foodcart.service.limits.FixedWindowLimiter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.Clock;
import java.time.Duration;

/**
 * Per-IP limits on the login endpoints (tracker S4.8), on top of the per-number limits: they stop one machine from
 * walking through many numbers. Generous, because mobile networks in India put many phones behind one address
 * (carrier-grade NAT). Registered as an MVC interceptor so the 429 still carries CORS headers and the browser can read it.
 */
@Component
public class AuthRateLimits implements HandlerInterceptor {
  static final Duration WINDOW = Duration.ofMinutes(10);
  private final FixedWindowLimiter requests;
  private final FixedWindowLimiter verifies;
  private final boolean trustProxy;
  private final Clock clock;

  @Autowired
  public AuthRateLimits(@Value("${app.auth-limits.request-otp-per-ip:30}") int requestsPerIp,
      @Value("${app.auth-limits.verify-otp-per-ip:60}") int verifiesPerIp,
      @Value("${app.trust-proxy:false}") boolean trustProxy) {
    this(new FixedWindowLimiter(requestsPerIp, WINDOW), new FixedWindowLimiter(verifiesPerIp, WINDOW), trustProxy, Clock.systemUTC());
  }

  AuthRateLimits(FixedWindowLimiter requests, FixedWindowLimiter verifies, boolean trustProxy, Clock clock) {
    this.requests = requests;
    this.verifies = verifies;
    this.trustProxy = trustProxy;
    this.clock = clock;
  }

  @Override
  public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
    if (!"POST".equals(request.getMethod())) return true;
    String path = request.getRequestURI();
    FixedWindowLimiter limiter = path.endsWith("/request-otp") ? requests : path.endsWith("/verify-otp") ? verifies : null;
    if (limiter == null) return true;
    long retryAfter = limiter.hit(clientIp(request), clock.instant());
    if (retryAfter == 0) return true;
    response.setStatus(429);
    response.setHeader("Retry-After", String.valueOf(retryAfter));
    response.setContentType("application/json");
    response.getWriter().write("{\"error\":\"Too many login attempts from this network. Try again in a few minutes.\"}");
    return false;
  }

  /**
   * The caller's address. Behind a load balancer every request comes from the balancer, so set app.trust-proxy=true
   * there; the last X-Forwarded-For entry is the one the balancer added, the earlier ones are whatever the client sent.
   * Without a proxy, never trust the header: anyone could send a new value each time to dodge the limit.
   */
  String clientIp(HttpServletRequest request) {
    String forwarded = request.getHeader("X-Forwarded-For");
    if (trustProxy && forwarded != null && !forwarded.isBlank()) {
      String[] hops = forwarded.split(",");
      return hops[hops.length - 1].trim();
    }
    return request.getRemoteAddr();
  }
}
