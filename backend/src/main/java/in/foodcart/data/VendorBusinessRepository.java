package in.foodcart.data;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface VendorBusinessRepository extends MongoRepository<VendorBusinessEntity, String> {}
