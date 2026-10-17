package in.foodcart.config;

import in.foodcart.data.CatalogCategoryEntity;
import in.foodcart.data.CatalogCategoryRepository;
import in.foodcart.service.categories.CategoryNames;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

@Configuration
public class CatalogCategorySeed {
  @Bean
  CommandLineRunner seedCatalogCategories(CatalogCategoryRepository categories) {
    return args -> {
      if (categories.count() == 0) {
        String[] names = {"Momos", "Rolls", "Drinks", "Chaat"};
        for (int index = 0; index < names.length; index++) {
          CatalogCategoryEntity category = new CatalogCategoryEntity();
          category.name = names[index];
          category.nameKey = CategoryNames.key(names[index]);
          category.sortOrder = index;
          categories.save(category);
        }
      }
      // Older rows have no key yet (the duplicate check needs one on every category), and the launch icons bundled in
      // static/category-art are linked by key (momo.svg for "Momos").
      for (CatalogCategoryEntity category : categories.findAll()) {
        boolean changed = false;
        if (category.nameKey == null && category.name != null) {
          category.nameKey = CategoryNames.key(category.name);
          changed = true;
        }
        if (category.imageUrl == null && category.iconSvg == null && category.nameKey != null && category.nameKey.matches("[a-z0-9]{1,40}")
            && new ClassPathResource("static/category-art/" + category.nameKey + ".svg").exists()) {
          category.imageUrl = "/category-art/" + category.nameKey + ".svg";
          changed = true;
        }
        if (changed) categories.save(category);
      }
    };
  }
}
