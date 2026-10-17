package in.foodcart.data;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SubscriptionRunRepository extends MongoRepository<SubscriptionRunEntity, String> {
  Optional<SubscriptionRunEntity> findBySubscriptionIdAndDate(String subscriptionId, LocalDate date);

  List<SubscriptionRunEntity> findBySubscriptionIdAndDateAfter(String subscriptionId, LocalDate after);
}
