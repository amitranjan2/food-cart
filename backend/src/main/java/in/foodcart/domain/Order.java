package in.foodcart.domain;
import java.math.BigDecimal; import java.util.List;
public record Order(String id,long orderNumber,String vendorId,String customerId,String customerMobile,OrderStatus status,List<OrderItemSnapshot> items,BigDecimal total,String type,String paymentMethod) {}
