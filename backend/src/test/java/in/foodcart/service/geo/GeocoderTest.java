package in.foodcart.service.geo;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

/** Against a local stand-in for Nominatim, answering in its real response format. */
class GeocoderTest {
  private HttpServer osm;
  private final AtomicInteger calls = new AtomicInteger();
  private final AtomicReference<String> agent = new AtomicReference<>();
  private final AtomicReference<String> query = new AtomicReference<>();
  private volatile int status = 200;

  @BeforeEach
  void start() throws IOException {
    osm = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    osm.createContext("/", exchange -> {
      calls.incrementAndGet();
      agent.set(exchange.getRequestHeaders().getFirst("User-Agent"));
      query.set(exchange.getRequestURI().getRawQuery());
      String body = exchange.getRequestURI().getPath().equals("/reverse")
          ? "{\"lat\":\"28.4691\",\"lon\":\"77.0716\",\"display_name\":\"Galleria Market, DLF Phase IV, Sector 28, Gurugram, Haryana, 122009, India\","
            + "\"address\":{\"road\":\"Galleria Market\",\"suburb\":\"DLF Phase IV\",\"city_district\":\"Sector 28\",\"city\":\"Gurugram\",\"state\":\"Haryana\",\"postcode\":\"122009\",\"country\":\"India\"}}"
          : "[{\"lat\":\"28.4595\",\"lon\":\"77.0266\",\"display_name\":\"Sector 29, Gurugram, Haryana, India\",\"address\":{\"suburb\":\"Sector 29\",\"city\":\"Gurugram\",\"state\":\"Haryana\"}}]";
      byte[] out = body.getBytes(StandardCharsets.UTF_8);
      exchange.sendResponseHeaders(status, out.length);
      exchange.getResponseBody().write(out);
      exchange.close();
    });
    osm.start();
  }

  @AfterEach
  void stop() {
    osm.stop(0);
  }

  private Geocoder geocoder() {
    Geocoder g = new Geocoder("http://127.0.0.1:" + osm.getAddress().getPort(), "ops@example.com");
    g.minGapMillis = 0;
    return g;
  }

  @Test
  void reverseGivesAShortAreaAndIdentifiesItself() {
    Geocoder.Place place = geocoder().reverse(28.4691, 77.0716);
    assertEquals("Galleria Market, DLF Phase IV, Sector 28, Gurugram", place.area());
    assertEquals("SuprMama/0.1 (https://suprmama.in; ops@example.com)", agent.get());
    assertTrue(query.get().contains("format=jsonv2"));
  }

  @Test
  void searchIsLimitedToIndiaAndCached() {
    Geocoder g = geocoder();
    List<Geocoder.Place> hits = g.search("sector 29 gurgaon");
    assertEquals(1, hits.size());
    assertEquals("Sector 29, Gurugram", hits.get(0).area());
    assertEquals(28.4595, hits.get(0).lat());
    assertTrue(query.get().contains("countrycodes=in"));
    g.search("Sector 29 Gurgaon ");
    assertEquals(1, calls.get(), "same search again comes from the cache");
    assertEquals(List.of(), g.search("ab"), "too short to search");
  }

  @Test
  void callsAreSpacedOutForTheUsagePolicy() {
    Geocoder g = geocoder();
    g.minGapMillis = 300;
    long start = System.currentTimeMillis();
    g.reverse(28.1, 77.1);
    g.reverse(28.2, 77.2);
    assertTrue(System.currentTimeMillis() - start >= 300);
  }

  @Test
  void aFailedLookupSaysToTypeTheArea() {
    status = 503;
    IllegalStateException e = assertThrows(IllegalStateException.class, () -> geocoder().reverse(28.5, 77.5));
    assertEquals(Geocoder.FAILED, e.getMessage());
  }
}
