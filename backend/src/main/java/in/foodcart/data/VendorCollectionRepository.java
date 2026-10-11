package in.foodcart.data;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface VendorCollectionRepository extends MongoRepository<VendorCollectionEntity, String> {
  List<VendorCollectionEntity> findByVendorIdOrderByPeriodStartDesc(String vendorId);

  boolean existsByVendorIdAndPeriodStart(String vendorId, LocalDate periodStart);

  List<VendorCollectionEntity> findByStatusOrderByDueOnAsc(VendorCollectionEntity.Status status);

  Optional<VendorCollectionEntity> findByNumber(String number);
}
