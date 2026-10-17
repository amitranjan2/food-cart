package in.foodcart.data;

import in.foodcart.domain.VendorPlan;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface VendorInvoiceRepository extends MongoRepository<VendorInvoiceEntity, String> {
  List<VendorInvoiceEntity> findByVendorIdOrderByPeriodStartDesc(String vendorId);

  boolean existsByVendorIdAndPlanAndPeriodStart(String vendorId, VendorPlan plan, LocalDate periodStart);

  List<VendorInvoiceEntity> findByStatusOrderByDueOnAsc(VendorInvoiceEntity.Status status);

  Optional<VendorInvoiceEntity> findByNumber(String number);
}
