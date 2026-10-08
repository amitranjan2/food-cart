package in.foodcart.data;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface OtpChallengeRepository extends MongoRepository<OtpChallengeEntity, String> {}
