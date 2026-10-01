package in.foodcart.data;
import org.springframework.data.annotation.Id; import org.springframework.data.mongodb.core.index.CompoundIndex; import org.springframework.data.mongodb.core.mapping.Document; import java.time.Instant;
@Document("customerVendorHistory") @CompoundIndex(name="customer_vendor",def="{'customerId':1,'vendorId':1}",unique=true) public class CustomerVendorHistoryEntity { @Id public String id; public String customerId,vendorId; public Instant firstOrderedAt=Instant.now(),lastOrderedAt=Instant.now(); public int totalOrders; }
