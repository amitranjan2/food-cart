package in.foodcart.data;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/** A category every vendor can pick. Vendors can add new ones (CategoryNames keeps them from duplicating). */
@Document("catalogCategories")
public class CatalogCategoryEntity {
  @Id public String id;
  public String name;
  /** CategoryNames.key(name); one category per key. */
  @Indexed(unique = true, sparse = true) public String nameKey;
  /** Set by ops once an icon is made and approved; until then the storefront draws a generic plate. */
  public String imageUrl;
  public int sortOrder;
  /** Null for the ones we seeded. */
  @Indexed(sparse = true) public String createdByVendorId;
  public Instant createdAt;
}
