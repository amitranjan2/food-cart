package in.foodcart.data;
import org.springframework.data.annotation.Id; import org.springframework.data.mongodb.core.mapping.Document;
@Document("menuCategories") public class MenuCategoryEntity { @Id public String id; public String vendorId,name; public int sortOrder; }
