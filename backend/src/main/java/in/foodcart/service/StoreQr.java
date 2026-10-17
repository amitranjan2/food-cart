package in.foodcart.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;

import java.util.Map;

/**
 * The QR code for a store link, as SVG: one module per unit, so it scales to a phone screen or an A4 poster without
 * blurring. Error correction level Q (25 %) so a poster with a scuff or a fold still scans.
 */
public final class StoreQr {
  private StoreQr() {}

  /** Modules around the code; the standard asks for 4 so scanners find its edges. */
  static final int QUIET_ZONE = 4;

  public static BitMatrix matrix(String url) {
    try {
      return new QRCodeWriter().encode(url, BarcodeFormat.QR_CODE, 0, 0,
          Map.of(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.Q, EncodeHintType.MARGIN, QUIET_ZONE, EncodeHintType.CHARACTER_SET, "UTF-8"));
    } catch (WriterException e) {
      throw new IllegalArgumentException("Could not make a QR code for " + url, e);
    }
  }

  /** Dark modules as runs of one path, on a white square (the white matters: a QR on a coloured poster needs contrast). */
  public static String svg(String url) {
    BitMatrix m = matrix(url);
    int size = m.getWidth();
    StringBuilder path = new StringBuilder();
    for (int y = 0; y < size; y++) {
      int x = 0;
      while (x < size) {
        if (!m.get(x, y)) {
          x++;
          continue;
        }
        int start = x;
        while (x < size && m.get(x, y)) x++;
        path.append('M').append(start).append(' ').append(y).append('h').append(x - start).append("v1h").append(start - x).append('z');
      }
    }
    return "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 " + size + " " + size + "\" shape-rendering=\"crispEdges\">"
        + "<rect width=\"" + size + "\" height=\"" + size + "\" fill=\"#fff\"/>"
        + "<path fill=\"#000\" d=\"" + path + "\"/></svg>";
  }
}
