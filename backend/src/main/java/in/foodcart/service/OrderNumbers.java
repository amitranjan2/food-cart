package in.foodcart.service;

import in.foodcart.data.OrderCounterEntity;
import in.foodcart.data.OrderRepository;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

/**
 * Each vendor numbers its own orders: 1001, 1002, … The number is taken only once an order is paid (PaymentService),
 * so failed or abandoned payments don't use numbers up, and one atomic increment per vendor means two orders paid
 * at the same moment never share a number.
 */
@Service
public class OrderNumbers {
  /** A vendor's first order is FIRST + 1. */
  static final long FIRST = 1000;

  private final MongoTemplate mongo;
  private final OrderRepository orders;

  public OrderNumbers(MongoTemplate mongo, OrderRepository orders) {
    this.mongo = mongo;
    this.orders = orders;
  }

  public long next(String vendorId) {
    Query vendor = Query.query(Criteria.where("_id").is(vendorId));
    if (!mongo.exists(vendor, OrderCounterEntity.class)) {
      // Vendors with orders from before the counter carry on from their highest number.
      long highest = orders.findTopByVendorIdOrderByOrderNumberDesc(vendorId).map(o -> o.orderNumber).orElse(0L);
      try {
        mongo.insert(new OrderCounterEntity(vendorId, Math.max(highest, FIRST)));
      } catch (DuplicateKeyException startedByAnotherPayment) {
        // fine: the counter exists now
      }
    }
    OrderCounterEntity counter = mongo.findAndModify(vendor, new Update().inc("seq", 1),
        FindAndModifyOptions.options().returnNew(true), OrderCounterEntity.class);
    return counter.seq;
  }
}
