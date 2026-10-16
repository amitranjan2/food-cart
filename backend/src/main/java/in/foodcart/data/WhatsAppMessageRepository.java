package in.foodcart.data;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;

public interface WhatsAppMessageRepository extends MongoRepository<WhatsAppMessageEntity, String> {
  List<WhatsAppMessageEntity> findBySentAtAfter(Instant after);

  List<WhatsAppMessageEntity> findTop10ByMobileOrderBySentAtDesc(String mobile);
}
