package in.foodcart.data;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface CatalogCategoryRepository extends MongoRepository<CatalogCategoryEntity, String> {
  List<CatalogCategoryEntity> findAllByOrderBySortOrderAsc();
}
