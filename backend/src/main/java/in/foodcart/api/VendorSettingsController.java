package in.foodcart.api;

import in.foodcart.data.*;
import in.foodcart.service.AuthService;
import in.foodcart.service.StoreThemes;
import in.foodcart.service.VendorProfile;
import in.foodcart.service.slots.SlotRules;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/vendor")
public class VendorSettingsController {
  private final AuthService auth; private final VendorRepository vendors; private final MenuCategoryRepository categories;
  public VendorSettingsController(AuthService a,VendorRepository v,MenuCategoryRepository c){auth=a;vendors=v;categories=c;}
  private String owner(String header){return auth.actor(header,"VENDOR");}
  /** Name, description, colour pair and stall location (the vendor app's profile page). Logo and cover are left as they are. */
  @PutMapping("/me/profile") public VendorEntity profile(@RequestHeader("Authorization") String h,@RequestBody VendorProfile.Input input){
    VendorEntity v=vendors.findById(owner(h)).orElseThrow();
    VendorProfile.apply(v,input);
    v.updatedAt=Instant.now();return vendors.save(v);
  }

  /** The colour pairs a vendor can choose from. */
  @GetMapping("/themes") public List<StoreThemes.Theme> themes(){return StoreThemes.ALL;}
  record Hours(List<OpeningHours> openingHours) {}

  /** Replaces the weekly hours. A day left out is a closed day; an empty list means no slots and no orders. */
  @PutMapping("/me/hours") public VendorEntity hours(@RequestHeader("Authorization") String h,@RequestBody Hours input){
    VendorEntity v=vendors.findById(owner(h)).orElseThrow();
    v.openingHours=SlotRules.validate(input.openingHours());
    v.updatedAt=Instant.now();return vendors.save(v);
  }
  @PutMapping("/menu/categories/{id}") public MenuCategoryEntity category(@RequestHeader("Authorization") String h,@PathVariable String id,@RequestBody MenuCategoryEntity input){
    MenuCategoryEntity c=categories.findById(id).filter(x->x.vendorId.equals(owner(h))).orElseThrow(()->new SecurityException("Category not found"));c.name=input.name;c.sortOrder=input.sortOrder;return categories.save(c);
  }
}
