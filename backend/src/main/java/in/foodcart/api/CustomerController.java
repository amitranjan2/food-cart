package in.foodcart.api;

import in.foodcart.data.*;
import in.foodcart.service.AuthService;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/customers/me")
public class CustomerController {
  private final AuthService auth;
  private final HistoryRepository history;
  private final VendorRepository vendors;
  private final OrderRepository orders;
  private final CustomerRepository customers;

  public CustomerController(AuthService a, HistoryRepository h, VendorRepository v, OrderRepository o, CustomerRepository c) {
    auth = a;
    history = h;
    vendors = v;
    orders = o;
    customers = c;
  }

  record Profile(String mobile, String name) {}

  record NameInput(String name) {}

  @GetMapping
  Profile me(@RequestHeader("Authorization") String h) {
    CustomerEntity c = customers.findById(auth.actor(h, "CUSTOMER")).orElseThrow(() -> new SecurityException("Customer not found"));
    return new Profile(c.mobile, c.name);
  }

  /** Sets the name vendors see on orders. */
  @PatchMapping
  Profile name(@RequestHeader("Authorization") String h, @RequestBody NameInput input) {
    CustomerEntity c = customers.findById(auth.actor(h, "CUSTOMER")).orElseThrow(() -> new SecurityException("Customer not found"));
    String name = input.name() == null ? "" : input.name().trim().replaceAll("\\s+", " ");
    if (name.isEmpty()) throw new IllegalArgumentException("Enter your name.");
    if (name.length() > 60) throw new IllegalArgumentException("Keep your name under 60 characters.");
    c.name = name;
    c.updatedAt = java.time.Instant.now();
    customers.save(c);
    return new Profile(c.mobile, c.name);
  }

  @GetMapping("/orders")
  List<OrderEntity> orders(@RequestHeader("Authorization") String h) {
    return orders.findByCustomerIdOrderByCreatedAtDesc(auth.actor(h, "CUSTOMER"));
  }

  @GetMapping("/recent-vendors")
  List<Map<String, Object>> recent(@RequestHeader("Authorization") String h) {
    List<Map<String, Object>> result = new ArrayList<>();
    for (CustomerVendorHistoryEntity x : history.findByCustomerIdOrderByLastOrderedAtDesc(auth.actor(h, "CUSTOMER"))) {
      // A deleted vendor is skipped rather than crashing the whole list.
      vendors.findById(x.vendorId).ifPresent(v -> {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("vendor", PublicVendor.from(v));
        row.put("lastOrderedAt", x.lastOrderedAt);
        row.put("totalOrders", x.totalOrders);
        result.add(row);
      });
    }
    return result;
  }
}
