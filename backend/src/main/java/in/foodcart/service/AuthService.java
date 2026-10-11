package in.foodcart.service;

import in.foodcart.data.*;
import in.foodcart.service.onboarding.SelfOnboarding;
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
  private final SelfOnboarding onboarding;

  public AuthService(CustomerRepository c, VendorRepository v, SessionRepository s, OtpService otp, SelfOnboarding onboarding) {
    customers = c;
    vendors = v;
    sessions = s;
    this.otp = otp;
    this.onboarding = onboarding;
  }

  /** role is "vendor" or "customer", as it appears in the URL. */
  public void requestOtp(String role, String mobile) {
    validMobile(mobile);
    if ("vendor".equals(role)) {
      // Any number: a new one signs up a stall (SelfOnboarding). The OTP limits cap what this can cost.
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
    otp.verify("VENDOR", mobile, code);
    // The draft stall is made only after the code checks out, so nobody can create stalls for numbers they don't hold.
    VendorEntity v = vendors.findByMobile(mobile).orElseGet(() -> onboarding.draftFor(mobile));
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
