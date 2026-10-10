package in.foodcart.service.geo;

import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Turns a GPS point into an area name and an area name into points, using OpenStreetMap's Nominatim (free, no key).
 * Its usage policy asks for an identifying User-Agent and at most one request per second, so every call goes
 * through here: one at a time, at least a second apart, with recent answers cached. Fine for vendors setting up
 * their stall; customer-facing search would need a paid provider.
 */
@Service
public class Geocoder {
  private static final Logger log = LoggerFactory.getLogger(Geocoder.class);
  static final String FAILED = "Couldn't look up this location. Type the area instead.";

  public record Place(String area, double lat, double lng) {}

  private final RestClient http;
  private final com.fasterxml.jackson.databind.ObjectMapper json = new com.fasterxml.jackson.databind.ObjectMapper();
  private final Map<String, Object> cache = new LinkedHashMap<>(64, 0.75f, true) {
    @Override
    protected boolean removeEldestEntry(Map.Entry<String, Object> eldest) {
      return size() > 500;
    }
  };
  private long lastCall;
  /** Replaced in tests. */
  long minGapMillis = 1000;

  public Geocoder(
      @Value("${NOMINATIM_BASE:https://nominatim.openstreetmap.org}") String base,
      @Value("${NOMINATIM_CONTACT:dev@localhost}") String contact) {
    SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
    factory.setConnectTimeout(Duration.ofSeconds(5));
    factory.setReadTimeout(Duration.ofSeconds(8));
    this.http = RestClient.builder().baseUrl(base).requestFactory(factory)
        .defaultHeader("User-Agent", "FoodCart/0.1 (" + contact + ")")
        .defaultHeader("Accept-Language", "en")
        .build();
  }

  public Place reverse(double lat, double lng) {
    String key = String.format("r:%.4f,%.4f", lat, lng);
    Object cached = cached(key);
    if (cached != null) return (Place) cached;
    JsonNode body = call(() -> http.get()
        .uri(u -> u.path("/reverse").queryParam("lat", lat).queryParam("lon", lng).queryParam("format", "jsonv2").queryParam("zoom", 17).build())
        .retrieve().body(String.class));
    if (body == null || body.has("error")) throw new IllegalStateException(FAILED);
    Place place = new Place(area(body.path("address"), body.path("display_name").asText("")), lat, lng);
    remember(key, place);
    return place;
  }

  /** Up to 5 places in India matching the text. */
  @SuppressWarnings("unchecked")
  public List<Place> search(String query) {
    String text = query == null ? "" : query.trim();
    if (text.length() < 3) return List.of();
    String key = "s:" + text.toLowerCase();
    Object cached = cached(key);
    if (cached != null) return (List<Place>) cached;
    JsonNode body = call(() -> http.get()
        .uri(u -> u.path("/search").queryParam("q", text).queryParam("format", "jsonv2").queryParam("addressdetails", 1)
            .queryParam("countrycodes", "in").queryParam("limit", 5).build())
        .retrieve().body(String.class));
    List<Place> places = new ArrayList<>();
    if (body != null && body.isArray()) {
      for (JsonNode hit : body) {
        places.add(new Place(area(hit.path("address"), hit.path("display_name").asText("")), hit.path("lat").asDouble(), hit.path("lon").asDouble()));
      }
    }
    remember(key, places);
    return places;
  }

  /** "Galleria Market, DLF Phase IV, Sector 28, Gurugram": street / place, locality, city; no state, PIN or country. */
  static String area(JsonNode a, String fallback) {
    List<String> parts = new ArrayList<>();
    for (String field : new String[] {"road", "pedestrian", "neighbourhood", "quarter", "suburb", "city_district", "city", "town", "village"}) {
      String value = a.path(field).asText("");
      if (!value.isEmpty() && !parts.contains(value)) parts.add(value);
    }
    if (parts.isEmpty()) {
      String[] pieces = fallback.split(",\\s*");
      for (int i = 0; i < Math.min(3, pieces.length); i++) parts.add(pieces[i]);
    }
    return String.join(", ", parts.subList(0, Math.min(4, parts.size())));
  }

  private synchronized Object cached(String key) {
    return cache.get(key);
  }

  private synchronized void remember(String key, Object value) {
    cache.put(key, value);
  }

  private synchronized JsonNode call(java.util.function.Supplier<String> request) {
    long wait = lastCall + minGapMillis - System.currentTimeMillis();
    try {
      if (wait > 0) Thread.sleep(wait);
      String text = request.get();
      return text == null ? null : json.readTree(text);
    } catch (RestClientException e) {
      log.warn("Nominatim lookup failed: {}", e.getClass().getSimpleName());
      throw new IllegalStateException(FAILED);
    } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
      log.warn("Nominatim sent something that isn't JSON");
      throw new IllegalStateException(FAILED);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException(FAILED);
    } finally {
      lastCall = System.currentTimeMillis();
    }
  }
}
