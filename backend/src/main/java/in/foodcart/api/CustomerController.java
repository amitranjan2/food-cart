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

  public CustomerController(AuthService a, HistoryRepository h, VendorRepository v, OrderRepository o) {
    auth = a;
    history = h;
    vendors = v;
    orders = o;
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
