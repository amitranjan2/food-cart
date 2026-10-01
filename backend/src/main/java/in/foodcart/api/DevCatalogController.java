package in.foodcart.api;

import in.foodcart.data.MenuItemEntity;
import in.foodcart.data.MenuItemRepository;
import in.foodcart.data.VendorEntity;
import in.foodcart.data.VendorRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Profile("local")
@RequestMapping("/api/dev")
public class DevCatalogController {
  private final VendorRepository vendors;
  private final MenuItemRepository items;

  public DevCatalogController(VendorRepository vendors, MenuItemRepository items) {
    this.vendors = vendors;
    this.items = items;
  }

  @PostMapping("/reset-raju-menu")
  public List<MenuItemEntity> resetRajuMenu() {
    return resetMenu("raju-momos", "http://localhost:8080/uploads/raju-momos-cover.png", new Object[][] {
      {"Veg Tandoori Momos", 120, "VEG", "Crisp tandoori momos with mint chutney"},
      {"Chicken Afghani Momos", 160, "NON_VEG", "Creamy chicken momos, grilled to order"},
      {"Paneer Chilli Momos", 140, "VEG", "Paneer-filled momos with a chilli kick"},
      {"Egg Schezwan Roll", 110, "EGG", "Egg roll with spicy schezwan sauce"}
    });
  }

  @PostMapping("/reset-sharma-menu")
  public List<MenuItemEntity> resetSharmaMenu() {
    VendorEntity vendor = vendors.findBySlug("sharma-chaat").orElseThrow();
    vendor.coverImageUrl = "http://localhost:8080/uploads/sharma-chaat-test.png";
    vendor.themeColor = "#4D1636";
    vendors.save(vendor);
    return resetMenu("sharma-chaat", "http://localhost:8080/uploads/sharma-chaat-test.png", new Object[][] {
      {"Aloo Tikki Chaat", 95, "VEG", "Crisp potato tikki, yogurt, tamarind and house masala"},
      {"Dahi Papdi Chaat", 120, "VEG", "Crunchy papdi layered with chilled dahi and chutneys"},
      {"Paneer Chilli Chaat", 140, "VEG", "Spiced paneer, peppers and a tangy chaat dressing"},
      {"Egg Keema Chaat", 150, "EGG", "Masala egg keema with onion, coriander and lime"}
    });
  }

  private List<MenuItemEntity> resetMenu(String slug, String imageUrl, Object[][] data) {
    VendorEntity vendor = vendors.findBySlug(slug).orElseThrow();
    items.findByVendorIdOrderBySortOrder(vendor.id).forEach(items::delete);
    List<MenuItemEntity> saved = new ArrayList<>();
    for (int index = 0; index < data.length; index++) {
      MenuItemEntity item = new MenuItemEntity();
      item.vendorId = vendor.id;
      item.name = (String) data[index][0];
      item.price = BigDecimal.valueOf((Integer) data[index][1]);
      item.foodType = (String) data[index][2];
      item.description = (String) data[index][3];
      item.imageUrl = imageUrl;
      item.sortOrder = index;
      saved.add(items.save(item));
    }
    return saved;
  }
}
