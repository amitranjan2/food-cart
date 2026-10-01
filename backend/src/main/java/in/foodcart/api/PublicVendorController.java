package in.foodcart.api;
import in.foodcart.data.*; import org.springframework.http.*; import org.springframework.web.bind.annotation.*; import java.util.*;
@RestController @RequestMapping("/api/public/vendors") @CrossOrigin(origins="${app.cors-origin}")
public class PublicVendorController {
 private final VendorRepository vendors; private final MenuItemRepository items; private final MenuCategoryRepository categories;
 public PublicVendorController(VendorRepository v,MenuItemRepository i,MenuCategoryRepository c){vendors=v;items=i;categories=c;}
 @GetMapping public List<VendorEntity> vendors(){return vendors.findByStatusOrderByNameAsc(in.foodcart.domain.VendorStatus.OPEN);}
 @GetMapping("/{slug}") public ResponseEntity<VendorEntity> vendor(@PathVariable String slug){return vendors.findBySlug(slug).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());}
 @GetMapping("/{slug}/menu") public ResponseEntity<Map<String,Object>> menu(@PathVariable String slug){return vendors.findBySlug(slug).map(v->{Map<String,Object> result=new LinkedHashMap<>();result.put("categories",categories.findByVendorIdOrderBySortOrder(v.id));result.put("items",items.findByVendorIdOrderBySortOrder(v.id));return ResponseEntity.ok(result);}).orElse(ResponseEntity.notFound().build());}
}
