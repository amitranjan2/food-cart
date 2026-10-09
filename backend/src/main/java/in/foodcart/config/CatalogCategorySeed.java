package in.foodcart.config;

import in.foodcart.data.CatalogCategoryEntity;
import in.foodcart.data.CatalogCategoryRepository;
import in.foodcart.service.categories.CategoryNames;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CatalogCategorySeed {
  @Bean
  CommandLineRunner seedCatalogCategories(CatalogCategoryRepository categories) {
    return args -> {
      // Older rows have no key yet; the duplicate check needs one on every category.
      for (CatalogCategoryEntity category : categories.findAll()) {
        if (category.nameKey == null && category.name != null) {
          category.nameKey = CategoryNames.key(category.name);
          categories.save(category);
        }
      }
      if (categories.count() > 0) return;
      String[] names = {"Momos", "Rolls", "Drinks", "Chaat"};
      for (int index = 0; index < names.length; index++) {
        CatalogCategoryEntity category = new CatalogCategoryEntity();
        category.name = names[index];
        category.nameKey = CategoryNames.key(names[index]);
        category.sortOrder = index;
        categories.save(category);
      }
    };
  }
}
