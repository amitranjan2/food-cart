package in.foodcart.data;
import org.springframework.data.annotation.Id; import org.springframework.data.mongodb.core.index.Indexed; import org.springframework.data.mongodb.core.mapping.Document; import java.time.Instant;
@Document("customers") public class CustomerEntity { @Id public String id; @Indexed(unique=true) public String mobile; public String name; public Instant createdAt=Instant.now(),updatedAt=Instant.now(); }
