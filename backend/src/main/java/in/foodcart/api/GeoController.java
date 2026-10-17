package in.foodcart.api;

import in.foodcart.service.AuthService;
import in.foodcart.service.geo.Geocoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Location lookups for the vendor's stall address. Vendors only, so the shared free quota isn't open to the internet. */
@RestController
@RequestMapping("/api/vendor/geo")
public class GeoController {
  private final AuthService auth;
  private final Geocoder geocoder;

  public GeoController(AuthService auth, Geocoder geocoder) {
    this.auth = auth;
    this.geocoder = geocoder;
  }

  @GetMapping("/reverse")
  public Geocoder.Place reverse(@RequestHeader("Authorization") String header, @RequestParam double lat, @RequestParam double lng) {
    auth.actor(header, "VENDOR");
    return geocoder.reverse(lat, lng);
  }

  @GetMapping("/search")
  public List<Geocoder.Place> search(@RequestHeader("Authorization") String header, @RequestParam String q) {
    auth.actor(header, "VENDOR");
    return geocoder.search(q);
  }
}
