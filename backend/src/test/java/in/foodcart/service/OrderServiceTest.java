package in.foodcart.service;
import in.foodcart.domain.*; import org.junit.jupiter.api.Test; import java.math.BigDecimal; import java.util.*; import static org.junit.jupiter.api.Assertions.*;
class OrderServiceTest {
 private final OrderService service=new OrderService();
 private final Vendor open=new Vendor("v","raju-momos","Raju",VendorStatus.OPEN);
 private OrderService.Catalog catalog(Vendor vendor,MenuItem item){return new OrderService.Catalog(){public Vendor vendor(String id){return vendor;}public MenuItem item(String vendorId,String id){return item;}};}
 private OrderService.Checkout checkout(BigDecimal price){return new OrderService.Checkout("v","c","9999999999","PICKUP",List.of(new OrderService.CartLine("i",2,price)));}
 @Test void createsPriceSnapshotsAndCalculatesServerTotal(){MenuItem item=new MenuItem("i","v","Veg Momos",new BigDecimal("80"),true,true);Order o=service.create(checkout(new BigDecimal("80")),catalog(open,item),1042);assertEquals(new BigDecimal("160"),o.total());assertEquals("Veg Momos",o.items().get(0).name());}
 @Test void rejectsSoldOutItems(){MenuItem item=new MenuItem("i","v","Veg",new BigDecimal("80"),true,false);assertThrows(IllegalStateException.class,()->service.create(checkout(new BigDecimal("80")),catalog(open,item),1));}
 @Test void rejectsClosedVendor(){MenuItem item=new MenuItem("i","v","Veg",new BigDecimal("80"),true,true);assertThrows(IllegalStateException.class,()->service.create(checkout(new BigDecimal("80")),catalog(new Vendor("v","x","X",VendorStatus.CLOSED),item),1));}
 @Test void rejectsChangedPrice(){MenuItem item=new MenuItem("i","v","Veg",new BigDecimal("90"),true,true);assertThrows(IllegalStateException.class,()->service.create(checkout(new BigDecimal("80")),catalog(open,item),1));}
 @Test void protectsOwnershipAndTransitions(){Order o=new Order("o",1,"v","c","x",OrderStatus.PLACED,List.of(),BigDecimal.ZERO,"PICKUP","CASH");assertThrows(SecurityException.class,()->service.transition(o,"other",OrderStatus.ACCEPTED));assertThrows(IllegalStateException.class,()->service.transition(o,"v",OrderStatus.READY));assertEquals(OrderStatus.ACCEPTED,service.transition(o,"v",OrderStatus.ACCEPTED).status());}
}
