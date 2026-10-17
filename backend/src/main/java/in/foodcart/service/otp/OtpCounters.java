package in.foodcart.service.otp;

import in.foodcart.data.OtpCounterEntity;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;

/** Daily counters for the login-code limits, kept in Mongo so every API instance shares them and restarts keep them. */
@Component
public class OtpCounters {
  private final MongoTemplate mongo;

  public OtpCounters(MongoTemplate mongo) {
    this.mongo = mongo;
  }

  /** Adds one and returns the new count, atomically. */
  public long add(String id, LocalDate day) {
    Query query = Query.query(Criteria.where("_id").is(id));
    Update update = new Update().inc("count", 1).setOnInsert("purgeAt", purgeAt(day));
    OtpCounterEntity counter = mongo.findAndModify(query, update, FindAndModifyOptions.options().upsert(true).returnNew(true), OtpCounterEntity.class);
    return counter == null ? 1 : counter.count;
  }

  public long count(String id) {
    OtpCounterEntity counter = mongo.findById(id, OtpCounterEntity.class);
    return counter == null ? 0 : counter.count;
  }

  /** Kept a day past the India day it counts, so a counter is never dropped while its day is still running anywhere. */
  static Instant purgeAt(LocalDate day) {
    return day.plusDays(2).atStartOfDay(OtpLimits.ZONE).toInstant();
  }
}
