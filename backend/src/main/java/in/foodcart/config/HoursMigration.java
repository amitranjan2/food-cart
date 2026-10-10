package in.foodcart.config;

import in.foodcart.data.VendorRepository;
import in.foodcart.service.slots.SlotRules;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;

import java.time.Instant;

/** Every profile, once per vendor: hours saved as "closes after midnight" become same-day slots (SlotRules.splitAtMidnight). */
@Configuration
public class HoursMigration {
  private static final Logger log = LoggerFactory.getLogger(HoursMigration.class);
  private final VendorRepository vendors;

  public HoursMigration(VendorRepository vendors) {
    this.vendors = vendors;
  }

  @EventListener(ApplicationReadyEvent.class)
  public void splitOldHours() {
    vendors.findAll().forEach(v -> {
      var split = SlotRules.splitAtMidnight(v.openingHours);
      if (split == null) return;
      v.openingHours = split;
      v.updatedAt = Instant.now();
      vendors.save(v);
      log.info("Split after-midnight opening hours for vendor {}", v.slug);
    });
  }
}
