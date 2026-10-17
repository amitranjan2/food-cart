package in.foodcart.config;

import in.foodcart.data.OpeningHours;
import in.foodcart.data.VendorRepository;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;

import java.time.DayOfWeek;

/** Local development only: gives demo vendors without hours a long day (06:00 to 02:00 the next morning) so slots always exist. */
@Configuration
@Profile("local")
public class DemoHours {
  private final VendorRepository vendors;

  public DemoHours(VendorRepository vendors) {
    this.vendors = vendors;
  }

  // After startup, so the demo vendors created by SeedData and DemoData already exist.
  @EventListener(ApplicationReadyEvent.class)
  public void demoOpeningHours() {
    vendors.findAll().forEach(v -> {
      if (v.openingHours != null && !v.openingHours.isEmpty()) return;
      for (DayOfWeek day : DayOfWeek.values()) {
        v.openingHours.add(new OpeningHours(day, "00:00", "02:00"));
        v.openingHours.add(new OpeningHours(day, "06:00", "24:00"));
      }
      vendors.save(v);
    });
  }
}
