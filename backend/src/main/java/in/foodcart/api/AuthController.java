package in.foodcart.api;

import in.foodcart.service.AuthService;
import in.foodcart.service.otp.OtpDelivery;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final AuthService auth;
  private final OtpDelivery delivery;

  public AuthController(AuthService a, OtpDelivery d) {
    auth = a;
    delivery = d;
  }

  record RequestOtp(String mobile) {}

  record Verify(String mobile, String otp) {}

  @PostMapping("/{role}/request-otp")
  Map<String, Object> request(@PathVariable String role, @RequestBody RequestOtp body) {
    String ref = auth.requestOtp(role, body.mobile());
    return ref == null ? Map.of("sent", true) : Map.of("sent", true, "ref", ref);
  }

  /** Did the code from request-otp reach WhatsApp? WAITING, DELIVERED or FAILED (with a message to show). */
  @GetMapping("/otp-delivery/{ref}")
  Map<String, Object> delivery(@PathVariable String ref) {
    return delivery.status(ref);
  }

  @PostMapping("/logout")
  Map<String, Object> logout(@RequestHeader(value = "Authorization", required = false) String h) {
    auth.logout(h);
    return Map.of("loggedOut", true);
  }

  @PostMapping("/{role}/verify-otp")
  Map<String, String> verify(@PathVariable String role, @RequestBody Verify b) {
    String token;
    if ("vendor".equals(role)) token = auth.vendor(b.mobile(), b.otp());
    else if ("customer".equals(role)) token = auth.customer(b.mobile(), b.otp());
    else throw new IllegalArgumentException("Unknown login type.");
    return Map.of("token", token, "role", role);
  }
}
