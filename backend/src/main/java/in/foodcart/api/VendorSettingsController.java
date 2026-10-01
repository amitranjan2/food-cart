package in.foodcart.api;

import in.foodcart.data.*;
import in.foodcart.service.AuthService;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;

@RestController
@RequestMapping("/api/vendor")
public class VendorSettingsController {
  private final AuthService auth; private final VendorRepository vendors; private final MenuCategoryRepository categories;
  public VendorSettingsController(AuthService a,VendorRepository v,MenuCategoryRepository c){auth=a;vendors=v;categories=c;}
  private String owner(String header){return auth.actor(header,"VENDOR");}
  @PutMapping("/me/profile") public VendorEntity profile(@RequestHeader("Authorization") String h,@RequestBody VendorEntity input){
    VendorEntity v=vendors.findById(owner(h)).orElseThrow(); v.name=input.name;v.description=input.description;v.address=input.address;v.logoUrl=input.logoUrl;v.coverImageUrl=input.coverImageUrl;
    if(input.themeColor!=null&&input.themeColor.matches("#[0-9a-fA-F]{6}"))v.themeColor=input.themeColor;
    v.updatedAt=Instant.now();return vendors.save(v);
  }
  @PutMapping("/menu/categories/{id}") public MenuCategoryEntity category(@RequestHeader("Authorization") String h,@PathVariable String id,@RequestBody MenuCategoryEntity input){
    MenuCategoryEntity c=categories.findById(id).filter(x->x.vendorId.equals(owner(h))).orElseThrow(()->new SecurityException("Category not found"));c.name=input.name;c.sortOrder=input.sortOrder;return categories.save(c);
  }
}
