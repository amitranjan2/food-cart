package in.foodcart.config;

import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.index.IndexInfo;
import org.springframework.data.mongodb.core.index.PartialIndexFilter;
import org.springframework.data.mongodb.core.query.Criteria;

import java.util.List;

/**
 * Makes vendors.mobile unique (one stall per number, tracker S4.9). Vendor login looks the stall up by mobile, so two
 * stalls on one number break login for both. Runs at every start:
 * - duplicates exist → logs them and leaves the index as it is (the rest of the platform keeps working; fix the data
 *   and restart);
 * - otherwise replaces the old non-unique "mobile" index with a unique one.
 */
@Configuration
public class VendorMobileIndex {
  private static final Logger log = LoggerFactory.getLogger(VendorMobileIndex.class);
  static final String NAME = "mobile_unique";
  private final MongoTemplate mongo;

  public VendorMobileIndex(MongoTemplate mongo) {
    this.mongo = mongo;
  }

  @EventListener(ApplicationReadyEvent.class)
  public void ensureUnique() {
    var indexes = mongo.indexOps("vendors");
    List<IndexInfo> existing = indexes.getIndexInfo();
    if (existing.stream().anyMatch(i -> NAME.equals(i.getName()))) return;

    List<Document> duplicates = mongo.getCollection("vendors").aggregate(List.of(
        new Document("$match", new Document("mobile", new Document("$type", "string"))),
        new Document("$group", new Document("_id", "$mobile").append("n", new Document("$sum", 1)).append("slugs", new Document("$push", "$slug"))),
        new Document("$match", new Document("n", new Document("$gt", 1))))).into(new java.util.ArrayList<>());
    if (!duplicates.isEmpty()) {
      duplicates.forEach(d -> log.error("Mobile {} is used by several stalls {}: they can't log in. Give each stall its own number, then restart.", d.get("_id"), d.get("slugs")));
      return;
    }
    existing.stream().filter(i -> "mobile".equals(i.getName())).findFirst().ifPresent(old -> indexes.dropIndex(old.getName()));
    indexes.ensureIndex(new Index().on("mobile", Sort.Direction.ASC).unique().named(NAME)
        .partial(PartialIndexFilter.of(Criteria.where("mobile").type(2))));
    log.info("vendors.mobile is now unique");
  }
}
