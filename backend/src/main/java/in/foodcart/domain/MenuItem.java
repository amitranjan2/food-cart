package in.foodcart.domain;
import java.math.BigDecimal;
public record MenuItem(String id,String vendorId,String name,BigDecimal price,boolean active,boolean available) {}
