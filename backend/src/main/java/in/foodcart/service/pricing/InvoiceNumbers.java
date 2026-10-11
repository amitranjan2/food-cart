package in.foodcart.service.pricing;

import in.foodcart.data.OrderEntity;
import org.bson.Document;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

/**
 * Tax invoice numbers, issued when an order is handed over (the food has then been supplied). Two series, because the
 * food (tax paid by us under s.9(5)) and our platform charges are separate supplies: SMF/26-27/000001 and
 * SMP/26-27/000001. Each restarts every financial year (April–March) and stays within GST's 16 characters.
 */
@Service
public class InvoiceNumbers {
  static final ZoneId INDIA = ZoneId.of("Asia/Kolkata");
  private final MongoTemplate mongo;

  public InvoiceNumbers(MongoTemplate mongo) {
    this.mongo = mongo;
  }

  /** Gives the order its invoice numbers once; later calls change nothing. The caller saves the order. */
  public void issue(OrderEntity o, Instant now) {
    if (o.invoice != null) return;
    String fy = financialYear(LocalDate.ofInstant(now, INDIA));
    OrderEntity.Invoice inv = new OrderEntity.Invoice();
    inv.foodNumber = "SMF/" + fy + "/" + String.format("%06d", next("SMF/" + fy));
    inv.platformNumber = "SMP/" + fy + "/" + String.format("%06d", next("SMP/" + fy));
    inv.issuedAt = now;
    o.invoice = inv;
  }

  /** "26-27" for 1 April 2026 – 31 March 2027. */
  static String financialYear(LocalDate day) {
    int start = day.getMonthValue() >= 4 ? day.getYear() : day.getYear() - 1;
    return String.format("%02d-%02d", start % 100, (start + 1) % 100);
  }

  private long next(String series) {
    Document counter = mongo.findAndModify(Query.query(Criteria.where("_id").is(series)), new Update().inc("seq", 1L),
        FindAndModifyOptions.options().upsert(true).returnNew(true), Document.class, "invoiceCounters");
    return ((Number) counter.get("seq")).longValue();
  }
}
