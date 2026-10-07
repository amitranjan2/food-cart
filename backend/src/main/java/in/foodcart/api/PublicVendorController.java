package in.foodcart.api;
import in.foodcart.data.*; import org.springframework.http.*; import org.springframework.web.bind.annotation.*; import java.util.*;
@RestController @RequestMapping("/api/public/vendors") @CrossOrigin(origins={"${app.cors-origin}","http://localhost:3000","http://localhost:3001"})
public class PublicVendorController {
 private final VendorRepository vendors; private final MenuItemRepository items; private final MenuCategoryRepository categories; private final CatalogCategoryRepository catalog;
 public PublicVendorController(VendorRepository v,MenuItemRepository i,MenuCategoryRepository c,CatalogCategoryRepository catalog){vendors=v;items=i;categories=c;this.catalog=catalog;}
 @GetMapping public List<VendorEntity> vendors(){return vendors.findByStatusOrderByNameAsc(in.foodcart.domain.VendorStatus.OPEN);}
 @GetMapping("/{slug}") public ResponseEntity<VendorEntity> vendor(@PathVariable String slug){return vendors.findBySlug(slug).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());}
 @GetMapping("/{slug}/menu") public ResponseEntity<Map<String,Object>> menu(@PathVariable String slug){return vendors.findBySlug(slug).map(v->{in.foodcart.service.PublicMenuView.Result menu=in.foodcart.service.PublicMenuView.assemble(catalog.findAllByOrderBySortOrderAsc(),categories.findByVendorIdOrderBySortOrder(v.id),items.findByVendorIdOrderBySortOrder(v.id));Map<String,Object> result=new LinkedHashMap<>();result.put("categories",menu.categories);result.put("items",menu.items);return ResponseEntity.ok(result);}).orElse(ResponseEntity.notFound().build());}
}
