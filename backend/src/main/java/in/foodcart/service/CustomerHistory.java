package in.foodcart.service;

import in.foodcart.data.CustomerVendorHistoryEntity;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.Instant;

/**
 * Counts a paid order in the customer's history with this vendor. One atomic upsert, so two orders paid at the same
 * moment are both counted and can't collide creating the record (the server retries a racing upsert itself).
 */
@Service
public class CustomerHistory {
  private final MongoTemplate mongo;

  public CustomerHistory(MongoTemplate mongo) {
    this.mongo = mongo;
  }

  public void recordOrder(String customerId, String vendorId, Instant at) {
    Query pair = Query.query(Criteria.where("customerId").is(customerId).and("vendorId").is(vendorId));
    // $min/$max set a missing field, so a record first made by a storefront visit gets its first-order time too.
    Update update = new Update()
        .inc("totalOrders", 1)
        .min("firstOrderedAt", at)
        .max("lastOrderedAt", at)
        .min("firstVisitedAt", at)
        .max("lastVisitedAt", at);
    mongo.upsert(pair, update, CustomerVendorHistoryEntity.class);
  }
}
