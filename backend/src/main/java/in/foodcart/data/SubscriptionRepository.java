package in.foodcart.data;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SubscriptionRepository extends MongoRepository<SubscriptionEntity, String> {
  List<SubscriptionEntity> findByCustomerIdAndStatusInOrderByCreatedAtDesc(String customerId, Collection<SubscriptionEntity.Status> statuses);

  Optional<SubscriptionEntity> findByIdAndCustomerId(String id, String customerId);

  List<SubscriptionEntity> findByStatus(SubscriptionEntity.Status status);

  long countByCustomerIdAndStatusIn(String customerId, Collection<SubscriptionEntity.Status> statuses);
}
