package in.foodcart.service;

import in.foodcart.data.*;
import in.foodcart.service.otp.OtpService;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

@Service
public class AuthService {
  private final CustomerRepository customers;
  private final VendorRepository vendors;
  private final SessionRepository sessions;
  private final OtpService otp;

  public AuthService(CustomerRepository c, VendorRepository v, SessionRepository s, OtpService otp) {
    customers = c;
    vendors = v;
    sessions = s;
    this.otp = otp;
  }

  /** role is "vendor" or "customer", as it appears in the URL. */
  public void requestOtp(String role, String mobile) {
    validMobile(mobile);
    if ("vendor".equals(role)) {
      // Vendors are onboarded by us; don't spend an SMS on numbers that can't log in.
      if (vendors.findByMobile(mobile).isEmpty()) throw new IllegalArgumentException("No vendor account uses this mobile number.");
      otp.send("VENDOR", mobile);
    } else if ("customer".equals(role)) {
      otp.send("CUSTOMER", mobile);
    } else {
      throw new IllegalArgumentException("Unknown login type.");
    }
  }

  public String customer(String mobile, String code) {
    validMobile(mobile);
    otp.verify("CUSTOMER", mobile, code);
    CustomerEntity c = customers.findByMobile(mobile).orElseGet(() -> {
      CustomerEntity x = new CustomerEntity();
      x.mobile = mobile;
      return customers.save(x);
    });
    return session(c.id, "CUSTOMER");
  }

  public String vendor(String mobile, String code) {
    validMobile(mobile);
    VendorEntity v = vendors.findByMobile(mobile).orElseThrow(() -> new SecurityException("No vendor is associated with this mobile"));
    otp.verify("VENDOR", mobile, code);
    return session(v.id, "VENDOR");
  }

  /** Ends a session so its token stops working. Unknown or missing tokens are ignored. */
  public void logout(String header) {
    if (header == null || !header.startsWith("Bearer ")) return;
    sessions.findByToken(header.substring(7)).ifPresent(sessions::delete);
  }

  public String actor(String header, String role) {
    if (header == null || !header.startsWith("Bearer ")) throw new SecurityException("Authentication required");
    SessionEntity s = sessions.findByToken(header.substring(7)).orElseThrow(() -> new SecurityException("Invalid session"));
    if (!role.equals(s.role) || s.expiresAt.isBefore(Instant.now())) throw new SecurityException("Session expired");
    return s.actorId;
  }

  private void validMobile(String mobile) {
    if (mobile == null || !mobile.matches("[6-9][0-9]{9}")) throw new IllegalArgumentException("Enter a valid 10-digit mobile number.");
  }

  private String session(String id, String role) {
    SessionEntity s = new SessionEntity();
    s.token = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
    s.actorId = id;
    s.role = role;
    s.expiresAt = Instant.now().plus(Duration.ofDays(30));
    sessions.save(s);
    return s.token;
  }
}
