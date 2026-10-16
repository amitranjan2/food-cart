package in.foodcart.data;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface OtpChallengeRepository extends MongoRepository<OtpChallengeEntity, String> {
  Optional<OtpChallengeEntity> findByDeliveryRef(String deliveryRef);
}
