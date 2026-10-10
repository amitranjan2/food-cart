package in.foodcart.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import in.foodcart.api.AuthRateLimits;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {
  /** Comma-separated, e.g. "https://suprmama.in,https://vendor.suprmama.in". */
  @Value("${app.cors-origin}") private String origins;
  private final AuthRateLimits authLimits;
  public CorsConfig(AuthRateLimits authLimits) { this.authLimits = authLimits; }
  @Override public void addInterceptors(InterceptorRegistry registry) {
    registry.addInterceptor(authLimits).addPathPatterns("/api/auth/*/request-otp", "/api/auth/*/verify-otp");
  }
  @Override public void addCorsMappings(CorsRegistry registry) {
    // Only the configured origins; the local profile lists the dev servers (application-local.yml).
    String[] allowed = java.util.Arrays.stream(origins.split(",")).map(String::trim).filter(o -> !o.isEmpty()).toArray(String[]::new);
    registry.addMapping("/api/**").allowedOrigins(allowed).allowedMethods("GET","POST","PUT","PATCH","DELETE","OPTIONS").allowedHeaders("Authorization","Content-Type").maxAge(3600);
  }
}
