package in.foodcart.data;
import org.springframework.data.annotation.Id; import org.springframework.data.mongodb.core.index.Indexed; import org.springframework.data.mongodb.core.mapping.Document; import java.time.Instant;
@Document("customers") public class CustomerEntity { @Id public String id; @Indexed(unique=true) public String mobile; public String name; /** Pay-at-stall orders this number didn't collect; at CheckoutService.NO_SHOW_LIMIT, pay-at-stall is off until support resets it. */ public int noShows; public Instant createdAt=Instant.now(),updatedAt=Instant.now(); }
