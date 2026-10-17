package in.foodcart.service.limits;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * At most {@code max} hits per key in each window, in memory. Good enough for one API instance; with several, each
 * keeps its own count (so the real limit is max × instances), which is acceptable for a backstop limit.
 */
public final class FixedWindowLimiter {
  /** Past this many keys, expired windows are swept so a flood of addresses can't grow the map without bound. */
  static final int SWEEP_AT = 50_000;

  private final int max;
  private final Duration window;
  private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

  private record Window(Instant start, int hits) {}

  public FixedWindowLimiter(int max, Duration window) {
    if (max < 1) throw new IllegalArgumentException("max must be at least 1");
    this.max = max;
    this.window = window;
  }

  /** Counts the hit and returns 0 when it is allowed, or the seconds until the key's window resets when it isn't. */
  public long hit(String key, Instant now) {
    if (windows.size() > SWEEP_AT) windows.values().removeIf(w -> !w.start().plus(window).isAfter(now));
    Window w = windows.compute(key, (k, old) -> old == null || !old.start().plus(window).isAfter(now) ? new Window(now, 1) : new Window(old.start(), old.hits() + 1));
    if (w.hits() <= max) return 0;
    return Math.max(1, Duration.between(now, w.start().plus(window)).toSeconds());
  }

  int size() {
    return windows.size();
  }
}
