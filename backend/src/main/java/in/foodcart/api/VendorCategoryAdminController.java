package in.foodcart.api;

import in.foodcart.data.*;
import in.foodcart.service.AuthService;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/vendor/menu/categories")
public class VendorCategoryAdminController {
  private final AuthService auth; private final MenuCategoryRepository categories;
  public VendorCategoryAdminController(AuthService auth,MenuCategoryRepository categories){this.auth=auth;this.categories=categories;}
  private String vendor(String header){return auth.actor(header,"VENDOR");}
  @GetMapping public List<MenuCategoryEntity> list(@RequestHeader("Authorization") String header){return categories.findByVendorIdOrderBySortOrder(vendor(header));}
  @PostMapping("/new") public MenuCategoryEntity create(@RequestHeader("Authorization") String header,@RequestBody MenuCategoryEntity input){input.id=null;input.vendorId=vendor(header);return categories.save(input);}
  @DeleteMapping("/{id}") public void delete(@RequestHeader("Authorization") String header,@PathVariable String id){MenuCategoryEntity category=categories.findById(id).filter(c->c.vendorId.equals(vendor(header))).orElseThrow(()->new SecurityException("Category not found"));categories.delete(category);}
}
