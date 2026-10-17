package in.foodcart.service;

import com.google.zxing.BinaryBitmap;
import com.google.zxing.RGBLuminanceSource;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.common.HybridBinarizer;
import com.google.zxing.qrcode.QRCodeReader;
import org.junit.jupiter.api.Test;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.*;

class StoreQrTest {
  /** Paints the SVG's path back into pixels and reads it with ZXing's decoder, so the test checks what a phone sees. */
  private static String scan(String svg) throws Exception {
    int size = Integer.parseInt(svg.replaceAll("(?s).*viewBox=\"0 0 (\\d+) .*", "$1"));
    int scale = 8;
    int[] pixels = new int[size * size * scale * scale];
    java.util.Arrays.fill(pixels, 0xFFFFFF);
    Matcher run = Pattern.compile("M(\\d+) (\\d+)h(\\d+)").matcher(svg);
    while (run.find()) {
      int x0 = Integer.parseInt(run.group(1)), y0 = Integer.parseInt(run.group(2)), w = Integer.parseInt(run.group(3));
      for (int y = y0 * scale; y < (y0 + 1) * scale; y++) {
        for (int x = x0 * scale; x < (x0 + w) * scale; x++) pixels[y * size * scale + x] = 0;
      }
    }
    RGBLuminanceSource source = new RGBLuminanceSource(size * scale, size * scale, pixels);
    return new QRCodeReader().decode(new BinaryBitmap(new HybridBinarizer(source))).getText();
  }

  @Test
  void theSvgScansBackToTheStoreLink() throws Exception {
    String svg = StoreQr.svg("https://suprmama.in/raju-momos");
    assertTrue(svg.startsWith("<svg xmlns=\"http://www.w3.org/2000/svg\""));
    assertFalse(svg.contains("<script"));
    assertEquals("https://suprmama.in/raju-momos", scan(svg));
  }

  @Test
  void keepsTheQuietZone() {
    BitMatrix m = StoreQr.matrix("https://suprmama.in/raju-momos");
    for (int i = 0; i < m.getWidth(); i++) {
      for (int edge = 0; edge < StoreQr.QUIET_ZONE; edge++) {
        assertFalse(m.get(i, edge) || m.get(edge, i) || m.get(i, m.getWidth() - 1 - edge), "module inside the quiet zone");
      }
    }
  }
}
