package in.foodcart.service;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

class ImageTypeTest {
  private static byte[] bytes(int... values) {
    byte[] out = new byte[values.length];
    for (int i = 0; i < values.length; i++) out[i] = (byte) values[i];
    return out;
  }

  @Test
  void recognisesJpegPngAndWebp() {
    assertEquals(".jpg", ImageType.extensionFor(bytes(0xFF, 0xD8, 0xFF, 0xE0), 4));
    assertEquals(".png", ImageType.extensionFor(bytes(0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A), 8));
    assertEquals(".webp", ImageType.extensionFor("RIFF\0\0\0\0WEBP".getBytes(StandardCharsets.ISO_8859_1), 12));
  }

  @Test
  void rejectsHtmlAndShortFiles() {
    byte[] html = "<html><script>".getBytes(StandardCharsets.UTF_8);
    assertNull(ImageType.extensionFor(html, html.length));
    assertNull(ImageType.extensionFor(bytes(0xFF, 0xD8), 2));
    assertNull(ImageType.extensionFor(null, 0));
  }
}
