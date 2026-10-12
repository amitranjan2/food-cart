package in.foodcart.service.categories;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.StringReader;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Turns an SVG drawn by a model into one the storefront can show to every customer (tracker S2.20): it is rebuilt from a
 * short whitelist of shapes and numbers, never copied. Whatever the input contains (scripts, links, images, text, styles,
 * event handlers, colours), only plain line shapes survive, drawn in one ink colour with round ends and no fill. Pure.
 *
 * Output: a 512 × 512 canvas, ink {@link #INK} (swapped for the vendor's colour when served), 4 to 400 shapes, 24 KB at most.
 */
public final class CategoryIconSvg {
  private CategoryIconSvg() {}

  public static final String INK = "#30404E";
  public static final int MAX_BYTES = 24_000;
  public static final int MIN_SHAPES = 4;
  public static final int MAX_SHAPES = 400;
  private static final int MAX_DEPTH = 6;

  private static final Set<String> SHAPES = Set.of("path", "circle", "ellipse", "line", "polyline", "polygon", "rect");
  /** Dropped without complaint: harmless metadata some tools add. */
  private static final Set<String> IGNORED = Set.of("title", "desc", "metadata");
  /** In this order in the output, so the same drawing always gives the same file. */
  private static final List<String> NUMBERS = List.of("cx", "cy", "r", "rx", "ry", "x", "y", "width", "height", "x1", "y1", "x2", "y2");

  private static final Pattern NUMBER = Pattern.compile("-?\\d{1,4}(\\.\\d{1,4})?");
  private static final Pattern POINTS = Pattern.compile("[-0-9., ]{1,3000}");
  private static final Pattern PATH = Pattern.compile("[MmLlHhVvCcSsQqTtAaZz0-9eE+\\-., \\n\\t]{1,4000}");
  private static final Pattern TRANSFORM = Pattern.compile("(?:(?:translate|scale|rotate)\\([-0-9., ]{1,60}\\) ?){1,4}");
  private static final Pattern INK_HEX = Pattern.compile("[0-9A-Fa-f]{6}");

  /** The clean SVG, or an IllegalArgumentException saying why the drawing can't be used. */
  public static String clean(String raw) {
    if (raw == null || raw.isBlank()) throw new IllegalArgumentException("empty drawing");
    int start = raw.indexOf("<svg");
    int end = raw.lastIndexOf("</svg>");
    if (start < 0 || end < start) throw new IllegalArgumentException("no <svg> in the reply");
    String xml = raw.substring(start, end + "</svg>".length());
    if (xml.length() > 200_000) throw new IllegalArgumentException("drawing too large");

    Element root = parse(xml).getDocumentElement();
    if (!"svg".equals(root.getTagName())) throw new IllegalArgumentException("root is not svg");
    String viewBox = root.getAttribute("viewBox").trim().replaceAll("\\s+", " ");
    if (!"0 0 512 512".equals(viewBox)) throw new IllegalArgumentException("viewBox must be 0 0 512 512");

    StringBuilder body = new StringBuilder();
    int[] shapes = {0};
    children(root, body, shapes, 0);
    if (shapes[0] < MIN_SHAPES) throw new IllegalArgumentException("too few shapes (" + shapes[0] + ")");

    String out = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\">\n"
        + "<g fill=\"none\" stroke=\"" + INK + "\" stroke-width=\"9\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n"
        + body + "</g>\n</svg>\n";
    if (out.length() > MAX_BYTES) throw new IllegalArgumentException("drawing too large after cleaning (" + out.length() + " bytes)");
    return out;
  }

  /** The icon in a vendor's colour: ink is six hex digits (no #); anything else keeps the default. */
  public static String withInk(String svg, String ink) {
    if (ink == null || !INK_HEX.matcher(ink).matches()) return svg;
    return svg.replace(INK, "#" + ink.toUpperCase());
  }

  private static void children(Element parent, StringBuilder out, int[] shapes, int depth) {
    if (depth > MAX_DEPTH) throw new IllegalArgumentException("nested too deeply");
    NodeList nodes = parent.getChildNodes();
    for (int i = 0; i < nodes.getLength(); i++) {
      Node node = nodes.item(i);
      if (node.getNodeType() != Node.ELEMENT_NODE) continue; // text and comments are dropped
      Element element = (Element) node;
      String tag = element.getTagName();
      if (IGNORED.contains(tag)) continue;
      if (tag.equals("g")) {
        String transform = transform(element);
        out.append("<g").append(transform).append(">\n");
        children(element, out, shapes, depth + 1);
        out.append("</g>\n");
      } else if (SHAPES.contains(tag)) {
        if (++shapes[0] > MAX_SHAPES) throw new IllegalArgumentException("too many shapes");
        out.append('<').append(tag).append(attributes(element, tag)).append("/>\n");
      } else {
        // script, style, image, use, text, foreignObject, defs, a, filters, gradients...: not a line drawing.
        throw new IllegalArgumentException("not allowed: <" + tag + ">");
      }
    }
  }

  private static String transform(Element element) {
    String value = element.getAttribute("transform").trim();
    if (value.isEmpty()) return "";
    if (!TRANSFORM.matcher(value).matches()) throw new IllegalArgumentException("bad transform");
    return " transform=\"" + value + "\"";
  }

  private static String attributes(Element element, String tag) {
    NamedNodeMap all = element.getAttributes();
    for (int i = 0; i < all.getLength(); i++) {
      String name = all.item(i).getNodeName().toLowerCase();
      String value = all.item(i).getNodeValue().toLowerCase();
      if (name.startsWith("on") || value.contains("javascript:") || value.contains("url(") || value.contains("data:")) {
        throw new IllegalArgumentException("not allowed: attribute " + name);
      }
    }
    StringBuilder out = new StringBuilder();
    for (String name : NUMBERS) {
      String value = element.getAttribute(name).trim();
      if (value.isEmpty()) continue;
      if (!NUMBER.matcher(value).matches()) throw new IllegalArgumentException("bad number in " + name);
      out.append(' ').append(name).append("=\"").append(value).append('"');
    }
    if (tag.equals("path")) {
      String d = element.getAttribute("d");
      if (!PATH.matcher(d).matches()) throw new IllegalArgumentException("bad path data");
      out.append(" d=\"").append(d.trim().replaceAll("\\s+", " ")).append('"');
    }
    if (tag.equals("polyline") || tag.equals("polygon")) {
      String points = element.getAttribute("points").trim();
      if (!POINTS.matcher(points).matches()) throw new IllegalArgumentException("bad points");
      out.append(" points=\"").append(points).append('"');
    }
    String transform = transform(element);
    out.append(transform);
    String width = element.getAttribute("stroke-width").trim();
    if (!width.isEmpty()) {
      if (!NUMBER.matcher(width).matches()) throw new IllegalArgumentException("bad stroke-width");
      double w = Double.parseDouble(width);
      if (w >= 2 && w <= 16) out.append(" stroke-width=\"").append(width).append('"'); // else the shared 9
    }
    return out.toString();
  }

  private static Document parse(String xml) {
    try {
      DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
      factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
      factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true); // no entities, no XXE
      factory.setXIncludeAware(false);
      factory.setExpandEntityReferences(false);
      return factory.newDocumentBuilder().parse(new InputSource(new StringReader(xml)));
    } catch (Exception e) {
      throw new IllegalArgumentException("not valid SVG: " + e.getMessage());
    }
  }
}
