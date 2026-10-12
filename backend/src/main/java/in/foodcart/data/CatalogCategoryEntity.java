package in.foodcart.data;

import com.fasterxml.jackson.annotation.JsonIgnore;
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
  /** Where the icon is served from (/category-art/<key>.svg) once there is one; until then the storefront draws a generic plate. */
  public String imageUrl;
  /** The generated icon, already cleaned (CategoryIconSvg). Served by CategoryArtController, never sent in category lists. */
  @JsonIgnore public String iconSvg;
  /** NONE until an icon is asked for; PENDING while it is drawn; READY; or FAILED (the generic plate stays). */
  @JsonIgnore public String iconStatus;
  @JsonIgnore public String iconError;
  @JsonIgnore public Instant iconRequestedAt;
  public int sortOrder;
  /** Null for the ones we seeded. */
  @Indexed(sparse = true) public String createdByVendorId;
  public Instant createdAt;
}
