package in.foodcart.service.categories;

import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

class CategoryIconSvgTest {
  private static final String SHAPES = "<circle cx=\"256\" cy=\"256\" r=\"232\"/><circle cx=\"200\" cy=\"200\" r=\"40\"/>"
      + "<path d=\"M100 100L200 200\"/><ellipse cx=\"300\" cy=\"300\" rx=\"50\" ry=\"30\"/>";

  private static String svg(String body) {
    return "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\">" + body + "</svg>";
  }

  private static void rejected(String raw, String reason) {
    IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () -> CategoryIconSvg.clean(raw));
    assertTrue(e.getMessage().contains(reason), e.getMessage());
  }

  private static String bundled(String name) throws Exception {
    try (InputStream in = CategoryIconSvgTest.class.getResourceAsStream("/category-art-examples/" + name + ".svg")) {
      return new String(in.readAllBytes(), StandardCharsets.UTF_8);
    }
  }

  @Test
  void theHandDrawnLaunchIconsPassUnchangedInLook() throws Exception {
    for (String name : new String[] {"momos", "rolls", "drinks", "chaat"}) {
      String out = CategoryIconSvg.clean(bundled(name));
      assertTrue(out.contains("stroke=\"#30404E\"") && out.contains("fill=\"none\""), name);
      assertTrue(out.length() < CategoryIconSvg.MAX_BYTES, name);
    }
  }

  @Test
  void keepsOnlyLineShapesInOneInkAndAddsTheSharedStyle() {
    String out = CategoryIconSvg.clean("Here is your icon:\n```svg\n" + svg("<g transform=\"translate(10 20)\">" + SHAPES + "</g>") + "\n```");
    assertTrue(out.startsWith("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\">"));
    assertTrue(out.contains("<g fill=\"none\" stroke=\"#30404E\" stroke-width=\"9\" stroke-linecap=\"round\" stroke-linejoin=\"round\">"));
    assertTrue(out.contains("transform=\"translate(10 20)\""));
    assertTrue(out.contains("<circle cx=\"256\" cy=\"256\" r=\"232\"/>"));
  }

  @Test
  void colourAndFillFromTheModelAreIgnored() {
    String out = CategoryIconSvg.clean(svg("<circle cx=\"256\" cy=\"256\" r=\"232\" fill=\"#ff0000\" stroke=\"#00ff00\" style=\"fill:red\" class=\"x\" id=\"y\"/>"
        + "<circle cx=\"200\" cy=\"200\" r=\"40\"/><path d=\"M1 1L2 2\"/><path d=\"M3 3L4 4\"/>"));
    assertFalse(out.contains("#ff0000") || out.contains("#00ff00") || out.contains("style") || out.contains("class") || out.contains("id="), out);
  }

  @Test
  void strokeWidthIsKeptOnlyWithinRange() {
    String out = CategoryIconSvg.clean(svg("<path d=\"M1 1L2 2\" stroke-width=\"6\"/><path d=\"M3 3L4 4\" stroke-width=\"200\"/>" + SHAPES));
    assertTrue(out.contains("stroke-width=\"6\""));
    assertFalse(out.contains("stroke-width=\"200\""));
  }

  @Test
  void scriptsImagesTextStylesAndLinksAreRefused() {
    rejected(svg(SHAPES + "<script>alert(1)</script>"), "not allowed: <script>");
    rejected(svg(SHAPES + "<image href=\"https://evil.example/x.png\"/>"), "not allowed: <image>");
    rejected(svg(SHAPES + "<text x=\"1\" y=\"1\">hi</text>"), "not allowed: <text>");
    rejected(svg(SHAPES + "<style>*{fill:red}</style>"), "not allowed: <style>");
    rejected(svg(SHAPES + "<foreignObject><div/></foreignObject>"), "not allowed: <foreignObject>");
    rejected(svg(SHAPES + "<use href=\"#a\"/>"), "not allowed: <use>");
    rejected(svg(SHAPES + "<a href=\"https://evil.example\"><path d=\"M1 1L2 2\"/></a>"), "not allowed: <a>");
  }

  @Test
  void eventHandlersAndUrlsInAttributesAreRefused() {
    rejected(svg("<circle onload=\"alert(1)\" cx=\"1\" cy=\"1\" r=\"1\"/>" + SHAPES), "attribute onload");
    rejected(svg("<path d=\"M1 1\" fill=\"url(#g)\"/>" + SHAPES), "attribute fill");
    rejected(svg("<path d=\"M1 1\" xlink:href=\"javascript:alert(1)\"/>" + SHAPES), "attribute");
  }

  @Test
  void entitiesAreNeverFetchedOrExpanded() {
    String doctype = "<!DOCTYPE svg [<!ENTITY x SYSTEM \"file:///etc/passwd\">]>";
    // A DOCTYPE before <svg> is cut off with the rest of the preamble, so nothing is defined...
    String out = CategoryIconSvg.clean(doctype + svg(SHAPES));
    assertFalse(out.contains("passwd") || out.contains("DOCTYPE") || out.contains("ENTITY"));
    // ...and using an entity in the drawing fails, rather than reading a file.
    rejected(doctype + svg(SHAPES + "<path d=\"&x;\"/>"), "not valid SVG");
    // A DOCTYPE inside the svg (the parser forbids them) is refused too.
    rejected(svg(SHAPES).replace("<circle", doctype + "<circle"), "not valid SVG");
  }

  @Test
  void badNumbersPathsAndTransformsAreRefused() {
    rejected(svg("<circle cx=\"1e9\" cy=\"1\" r=\"1\"/>" + SHAPES), "bad number");
    rejected(svg("<circle cx=\"javascript\" cy=\"1\" r=\"1\"/>" + SHAPES), "bad number");
    rejected(svg("<path d=\"M1 1 alert(1)\"/>" + SHAPES), "bad path data");
    rejected(svg("<g transform=\"matrix(1 2 3 4 5 6)\">" + SHAPES + "</g>"), "bad transform");
  }

  @Test
  void wrongCanvasOrTooFewOrTooManyShapesAreRefused() {
    rejected("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\">" + SHAPES + "</svg>", "viewBox");
    rejected(svg("<circle cx=\"1\" cy=\"1\" r=\"1\"/>"), "too few shapes");
    rejected(svg("<path d=\"M1 1L2 2\"/>".repeat(401)), "too many shapes");
    rejected("Sorry, I can't draw that.", "no <svg>");
    rejected("", "empty");
  }

  @Test
  void deepNestingAndHugeOutputAreRefused() {
    rejected(svg("<g><g><g><g><g><g><g>" + SHAPES + "</g></g></g></g></g></g></g>"), "nested too deeply");
    String big = "<path d=\"M" + "1 ".repeat(1900) + "\"/>";
    rejected(svg(big.repeat(8) + SHAPES), "too large");
  }

  @Test
  void theInkIsSwappedOnlyForSixHexDigits() {
    String out = CategoryIconSvg.clean(svg(SHAPES));
    assertTrue(CategoryIconSvg.withInk(out, "6a2f1a").contains("stroke=\"#6A2F1A\""));
    assertEquals(out, CategoryIconSvg.withInk(out, "red"));
    assertEquals(out, CategoryIconSvg.withInk(out, "\"><script>"));
    assertEquals(out, CategoryIconSvg.withInk(out, null));
  }
}
