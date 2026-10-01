package in.foodcart.data;
import org.springframework.data.annotation.Id; import org.springframework.data.mongodb.core.index.Indexed; import org.springframework.data.mongodb.core.mapping.Document; import java.time.Instant;
@Document("sessions") public class SessionEntity { @Id public String id; @Indexed(unique=true) public String token; public String actorId,role; @Indexed(expireAfterSeconds=0) public Instant expiresAt; }
