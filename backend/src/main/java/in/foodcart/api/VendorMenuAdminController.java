package in.foodcart.api;

import in.foodcart.data.MenuItemEntity;
import in.foodcart.data.MenuItemRepository;
import in.foodcart.service.AuthService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/vendor/menu/items")
public class VendorMenuAdminController {
  private final AuthService auth;
  private final MenuItemRepository items;

  public VendorMenuAdminController(AuthService auth, MenuItemRepository items) {
    this.auth = auth;
    this.items = items;
  }

  @DeleteMapping("/{id}")
  public void delete(@RequestHeader("Authorization") String header, @PathVariable String id) {
    String vendor = auth.actor(header, "VENDOR");
    MenuItemEntity item = items.findByIdAndVendorId(id, vendor).orElseThrow(() -> new SecurityException("Item not found"));
    items.delete(item);
  }
}
