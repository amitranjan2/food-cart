package in.foodcart.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import in.foodcart.api.AuthRateLimits;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {
  @Value("${app.cors-origin}") private String origin;
  private final AuthRateLimits authLimits;
  public CorsConfig(AuthRateLimits authLimits) { this.authLimits = authLimits; }
  @Override public void addInterceptors(InterceptorRegistry registry) {
    registry.addInterceptor(authLimits).addPathPatterns("/api/auth/*/request-otp", "/api/auth/*/verify-otp");
  }
  @Override public void addCorsMappings(CorsRegistry registry) {
    registry.addMapping("/api/**").allowedOrigins(origin, "http://localhost:3000", "http://localhost:3001").allowedMethods("GET","POST","PUT","PATCH","OPTIONS").allowedHeaders("Authorization","Content-Type").maxAge(3600);
  }
}
