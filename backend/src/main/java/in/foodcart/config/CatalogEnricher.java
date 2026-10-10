package in.foodcart.config;

import in.foodcart.data.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.*;
import java.util.*;

@Configuration @org.springframework.context.annotation.Profile("local")
public class CatalogEnricher {
 // Runs after SeedData and DemoData, which create the categories it files dishes under.
 @Bean @org.springframework.core.annotation.Order(3) CommandLineRunner enrichCatalog(VendorRepository vendors,MenuItemRepository items,MenuCategoryRepository categories){return a->{
   for(VendorEntity v:vendors.findAll()){
     if(v.themeColor==null||v.themeColor.equals("#102820"))v.themeColor=v.slug.equals("sharma-chaat")?"#4d1935":"#12342b";if(v.slug.equals("sharma-chaat")&&in.foodcart.service.StoreThemes.DEFAULT.equals(v.theme))v.theme="ROSE";
     if(v.slug.equals("raju-momos"))v.coverImageUrl="http://localhost:8080/uploads/raju-momos-cover.png";
     vendors.save(v);
     List<MenuCategoryEntity> cats=categories.findByVendorIdOrderBySortOrder(v.id);
     Map<String,String> catIds=new HashMap<>();for(MenuCategoryEntity c:cats)catIds.put(c.name,c.id);
     for(MenuItemEntity item:items.findByVendorIdOrderBySortOrder(v.id)){
       if(item.description==null||item.description.isBlank())item.description="Freshly prepared at the counter";
       if(item.foodType==null)item.foodType=item.name.toLowerCase().contains("chicken")||item.name.toLowerCase().contains("egg")?"NON_VEG":"VEG";
       if(item.categoryId==null){String category=item.name.toLowerCase().contains("coffee")?"Drinks":item.name.toLowerCase().contains("roll")?"Rolls":v.slug.equals("sharma-chaat")?"Chaat":"Momos";item.categoryId=catIds.get(category);}
       items.save(item);
     }
   }
 };}
}
