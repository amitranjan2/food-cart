package in.foodcart.data;

import com.fasterxml.jackson.annotation.JsonInclude;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Document("menuItems")
public class MenuItemEntity {
  @Id public String id;
  @Indexed public String vendorId;
  public String categoryId;
  public String name;
  public String description;
  public String imageUrl;
  public String foodType = "VEG";
  public BigDecimal price;
  public BigDecimal halfPrice;
  public boolean active = true;
  public boolean available = true;
  public boolean halfAvailable = true;
  public int sortOrder;
  @JsonInclude(JsonInclude.Include.NON_NULL) public List<SizeOption> sizes = new ArrayList<>();
  @JsonInclude(JsonInclude.Include.NON_NULL) public List<CustomVariant> variants = new ArrayList<>();

  public static class SizeOption {
    public String id;
    public String name;
    public BigDecimal price;
  }

  public static class CustomVariant {
    public String id;
    public String name;
    public boolean required;
    public String selection;
    public boolean priceIncreases;
    public List<VariantOption> options = new ArrayList<>();
  }

  public static class VariantOption {
    public String id;
    public String name;
    public String foodType;
    public BigDecimal price;
  }
}
