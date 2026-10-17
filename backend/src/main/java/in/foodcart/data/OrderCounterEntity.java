package in.foodcart.data;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/** The last order number a vendor gave out; see OrderNumbers. */
@Document("orderCounters")
public class OrderCounterEntity {
  /** The vendor id. */
  @Id public String id;
  public long seq;

  public OrderCounterEntity() {}

  public OrderCounterEntity(String id, long seq) {
    this.id = id;
    this.seq = seq;
  }
}
