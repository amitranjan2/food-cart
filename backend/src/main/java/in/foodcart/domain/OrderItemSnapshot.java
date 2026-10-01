package in.foodcart.domain;
import java.math.BigDecimal;
public record OrderItemSnapshot(String menuItemId,String name,BigDecimal price,int quantity,BigDecimal lineTotal) {}
