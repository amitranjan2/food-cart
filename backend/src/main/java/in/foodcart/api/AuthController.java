package in.foodcart.api;

import in.foodcart.service.AuthService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final AuthService auth;

  public AuthController(AuthService a) {
    auth = a;
  }

  record RequestOtp(String mobile) {}

  record Verify(String mobile, String otp) {}

  @PostMapping("/{role}/request-otp")
  Map<String, Object> request(@PathVariable String role, @RequestBody RequestOtp body) {
    auth.requestOtp(role, body.mobile());
    return Map.of("sent", true);
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
