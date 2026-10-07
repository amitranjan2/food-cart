package in.foodcart.data;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("catalogCategories")
public class CatalogCategoryEntity {
  @Id public String id;
  public String name;
  public String imageUrl;
  public int sortOrder;
}
