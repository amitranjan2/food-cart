package in.foodcart.api;

import in.foodcart.service.AuthService;
import in.foodcart.service.subscriptions.Subscriptions;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** The customer's weekly orders (tracker S2.21). Every call is for the signed-in customer's own subscriptions. */
@RestController
@RequestMapping("/api/subscriptions")
public class SubscriptionController {
  private final AuthService auth;
  private final Subscriptions subscriptions;

  public SubscriptionController(AuthService auth, Subscriptions subscriptions) {
    this.auth = auth;
    this.subscriptions = subscriptions;
  }

  private String customer(String header) {
    return auth.actor(header, "CUSTOMER");
  }

  @PostMapping
  public List<Map<String, Object>> create(@RequestHeader("Authorization") String h, @RequestBody Subscriptions.Create body) {
    String customer = customer(h);
    subscriptions.create(customer, body);
    return subscriptions.list(customer);
  }

  @GetMapping
  public List<Map<String, Object>> list(@RequestHeader("Authorization") String h) {
    return subscriptions.list(customer(h));
  }

  @PostMapping("/{id}/pause")
  public List<Map<String, Object>> pause(@RequestHeader("Authorization") String h, @PathVariable String id) {
    String customer = customer(h);
    subscriptions.pause(customer, id);
    return subscriptions.list(customer);
  }

  @PostMapping("/{id}/resume")
  public List<Map<String, Object>> resume(@RequestHeader("Authorization") String h, @PathVariable String id) {
    String customer = customer(h);
    subscriptions.resume(customer, id);
    return subscriptions.list(customer);
  }

  @PostMapping("/{id}/cancel")
  public List<Map<String, Object>> cancel(@RequestHeader("Authorization") String h, @PathVariable String id) {
    String customer = customer(h);
    subscriptions.cancel(customer, id);
    return subscriptions.list(customer);
  }

  @PostMapping("/{id}/skip/{date}")
  public List<Map<String, Object>> skip(@RequestHeader("Authorization") String h, @PathVariable String id, @PathVariable String date) {
    String customer = customer(h);
    subscriptions.skip(customer, id, LocalDate.parse(date));
    return subscriptions.list(customer);
  }

  @DeleteMapping("/{id}/skip/{date}")
  public List<Map<String, Object>> unskip(@RequestHeader("Authorization") String h, @PathVariable String id, @PathVariable String date) {
    String customer = customer(h);
    subscriptions.unskip(customer, id, LocalDate.parse(date));
    return subscriptions.list(customer);
  }
}
