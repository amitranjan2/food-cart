package in.foodcart.service.categories;

import in.foodcart.data.CatalogCategoryEntity;
import in.foodcart.data.CatalogCategoryRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class CategoryIconsTest {
  private static final String GOOD = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><circle cx=\"256\" cy=\"256\" r=\"232\"/>"
      + "<circle cx=\"200\" cy=\"200\" r=\"40\"/><path d=\"M100 100L200 200\"/><path d=\"M300 100L400 200\"/></svg>";

  private final CatalogCategoryRepository categories = mock(CatalogCategoryRepository.class);
  private final CatalogCategoryEntity bowl = new CatalogCategoryEntity();
  private final AtomicInteger asked = new AtomicInteger();

  {
    bowl.id = "c1";
    bowl.name = "Mini Rice Bowl";
    bowl.nameKey = "minricebowl";
    when(categories.findById("c1")).thenReturn(Optional.of(bowl));
    when(categories.save(any())).thenAnswer(call -> call.getArgument(0));
  }

  @SuppressWarnings("unchecked")
  private CategoryIcons icons(IconDrawer drawer, int cap) {
    ObjectProvider<IconDrawer> provider = mock(ObjectProvider.class);
    when(provider.getIfAvailable()).thenReturn(drawer);
    return new CategoryIcons(categories, provider, cap);
  }

  @Test
  void aGoodDrawingBecomesTheCategoriesIcon() {
    CategoryIcons icons = icons(name -> { asked.incrementAndGet(); return GOOD; }, 30);
    assertEquals("READY", icons.generate("c1", false));
    assertEquals("/category-art/minricebowl.svg", bowl.imageUrl);
    assertTrue(bowl.iconSvg.contains("stroke=\"#30404E\""));
    assertEquals(1, asked.get());
    assertEquals("READY", icons.generate("c1", false), "kept, not drawn again");
    assertEquals(1, asked.get());
    assertEquals("READY", icons.generate("c1", true));
    assertEquals(2, asked.get(), "unless the admin asks");
  }

  @Test
  void aBadFirstReplyGetsOneMoreTry() {
    CategoryIcons icons = icons(name -> asked.incrementAndGet() == 1 ? "<svg><script/></svg>" : GOOD, 30);
    assertEquals("READY", icons.generate("c1", false));
    assertEquals(2, asked.get());
  }

  @Test
  void aCategoryThatCantBeDrawnKeepsTheGenericPlate() {
    CategoryIcons icons = icons(name -> { asked.incrementAndGet(); throw new IllegalStateException("model stopped: refusal"); }, 30);
    assertEquals("FAILED", icons.generate("c1", false));
    assertEquals(CategoryIcons.ATTEMPTS, asked.get());
    assertNull(bowl.imageUrl, "no broken image");
    assertNull(bowl.iconSvg);
    assertTrue(bowl.iconError.contains("refusal"));
  }

  @Test
  void theDailyCapStopsDrawing() {
    when(categories.countByIconRequestedAtAfter(any())).thenReturn(30L);
    CategoryIcons icons = icons(name -> { asked.incrementAndGet(); return GOOD; }, 30);
    assertEquals("NONE", icons.generate("c1", false));
    assertEquals(0, asked.get());
    assertNull(bowl.imageUrl);
  }

  @Test
  void withoutAnApiKeyNothingHappens() {
    CategoryIcons icons = icons(null, 30);
    assertFalse(icons.enabled());
    assertEquals("NONE", icons.generate("c1", false));
    icons.requestAsync("c1");
    verify(categories, never()).save(any());
  }

  @Test
  void rejectingBringsTheGenericPlateBack() {
    CategoryIcons icons = icons(name -> GOOD, 30);
    icons.generate("c1", false);
    when(categories.findByNameKey("minricebowl")).thenReturn(Optional.of(bowl));
    assertTrue(icons.reject("minricebowl"));
    assertNull(bowl.imageUrl);
    assertNull(bowl.iconSvg);
    assertEquals("NONE", bowl.iconStatus);
    assertFalse(icons.reject("nope"));
  }
}
