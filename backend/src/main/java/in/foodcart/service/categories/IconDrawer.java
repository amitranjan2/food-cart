package in.foodcart.service.categories;

/** Draws the raw SVG for a category's icon (Claude in production, a fake in tests). The result is not trusted: CategoryIconSvg cleans it. */
public interface IconDrawer {
  String draw(String categoryName) throws Exception;
}
