package in.foodcart.data;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface CatalogCategoryRepository extends MongoRepository<CatalogCategoryEntity, String> {
  List<CatalogCategoryEntity> findAllByOrderBySortOrderAsc();

  Optional<CatalogCategoryEntity> findByNameKey(String nameKey);

  long countByCreatedByVendorIdAndCreatedAtAfter(String vendorId, Instant after);
}
