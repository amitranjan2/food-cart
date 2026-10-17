package in.foodcart.api;

import in.foodcart.data.*;
import in.foodcart.service.AuthService;
import in.foodcart.service.pricing.BillRules;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * The customer's tax invoices for a handed-over order (the storefront prints them at /{slug}/order/{id}/invoice).
 * Our own legal name, GSTIN and address come from the storefront's legal details, not from here.
 */
@RestController
public class InvoiceController {
  private final AuthService auth;
  private final OrderRepository orders;
  private final VendorRepository vendors;
  private final VendorBusinessRepository business;

  public InvoiceController(AuthService auth, OrderRepository orders, VendorRepository vendors, VendorBusinessRepository business) {
    this.auth = auth;
    this.orders = orders;
    this.vendors = vendors;
    this.business = business;
  }

  @GetMapping("/api/orders/{id}/invoice")
  public ResponseEntity<Map<String, Object>> invoice(@RequestHeader("Authorization") String header, @PathVariable String id) {
    String customerId = auth.actor(header, "CUSTOMER");
    OrderEntity o = orders.findById(id).filter(x -> customerId.equals(x.customerId)).orElseThrow(() -> new SecurityException("Order not found"));
    if (o.invoice == null || o.bill == null) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "The invoice is ready once your order has been handed over."));
    }
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("orderNumber", o.orderNumber);
    out.put("type", o.type);
    out.put("issuedAt", o.invoice.issuedAt);
    out.put("foodNumber", o.invoice.foodNumber);
    // null for pay-at-stall orders: no platform charges, so no platform invoice.
    out.put("platformNumber", o.invoice.platformNumber);
    out.put("paidAtStall", o.cash());
    out.put("customer", Map.of("name", o.customerName == null ? "" : o.customerName, "mobile", o.customerMobile == null ? "" : o.customerMobile));
    vendors.findById(o.vendorId).ifPresent(v -> {
      Map<String, Object> seller = new LinkedHashMap<>();
      seller.put("name", v.name);
      seller.put("address", v.address);
      seller.put("fssai", business.findById(v.id).map(b -> b.fssai).orElse(null));
      out.put("vendor", seller);
    });
    out.put("items", o.items.stream().map(i -> {
      Map<String, Object> line = new LinkedHashMap<>();
      line.put("name", i.name + (i.summary == null || i.summary.isBlank() ? "" : " (" + i.summary + ")"));
      line.put("quantity", i.quantity);
      line.put("price", i.price);
      line.put("lineTotal", i.lineTotal);
      return line;
    }).toList());
    java.math.BigDecimal[] food = BillRules.split(o.bill.foodGst);
    java.math.BigDecimal[] fee = BillRules.split(o.bill.platformFeeGst);
    out.put("bill", o.bill);
    out.put("taxSplit", Map.of("foodCgst", food[0], "foodSgst", food[1], "platformCgst", fee[0], "platformSgst", fee[1]));
    return ResponseEntity.ok(out);
  }
}
