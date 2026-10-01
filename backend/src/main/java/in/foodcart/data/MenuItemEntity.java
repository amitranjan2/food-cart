package in.foodcart.data;
import org.springframework.data.annotation.Id; import org.springframework.data.mongodb.core.index.Indexed; import org.springframework.data.mongodb.core.mapping.Document; import java.math.BigDecimal;
@Document("menuItems") public class MenuItemEntity { @Id public String id; @Indexed public String vendorId; public String categoryId,name,description,imageUrl,foodType="VEG"; public BigDecimal price,halfPrice; public boolean active=true,available=true,halfAvailable=true; public int sortOrder; }
