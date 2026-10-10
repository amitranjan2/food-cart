package in.foodcart.service.limits;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

class FixedWindowLimiterTest {
  private final Instant t0 = Instant.parse("2026-10-10T10:00:00Z");

  @Test
  void allowsUpToMaxPerWindowThenSaysHowLongToWait() {
    FixedWindowLimiter limiter = new FixedWindowLimiter(3, Duration.ofMinutes(10));
    for (int i = 0; i < 3; i++) assertEquals(0, limiter.hit("1.2.3.4", t0.plusSeconds(i)));
    assertEquals(598, limiter.hit("1.2.3.4", t0.plusSeconds(2)));
    assertEquals(0, limiter.hit("5.6.7.8", t0.plusSeconds(2)), "other addresses have their own count");
    assertEquals(0, limiter.hit("1.2.3.4", t0.plus(Duration.ofMinutes(10))), "a new window starts");
  }

  @Test
  void sweepsExpiredWindowsWhenManyAddressesPile_up() {
    FixedWindowLimiter limiter = new FixedWindowLimiter(1, Duration.ofMinutes(1));
    for (int i = 0; i <= FixedWindowLimiter.SWEEP_AT; i++) limiter.hit("ip" + i, t0);
    limiter.hit("late", t0.plus(Duration.ofMinutes(2)));
    assertEquals(1, limiter.size());
  }
}
