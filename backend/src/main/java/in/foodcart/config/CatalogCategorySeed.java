package in.foodcart.config;

import in.foodcart.data.CatalogCategoryEntity;
import in.foodcart.data.CatalogCategoryRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CatalogCategorySeed {
  @Bean
  CommandLineRunner seedCatalogCategories(CatalogCategoryRepository categories) {
    return args -> {
      if (categories.count() > 0) return;
      String[] names = {"Momos", "Rolls", "Drinks", "Chaat"};
      for (int index = 0; index < names.length; index++) {
        CatalogCategoryEntity category = new CatalogCategoryEntity();
        category.name = names[index];
        category.sortOrder = index;
        categories.save(category);
      }
    };
  }
}
