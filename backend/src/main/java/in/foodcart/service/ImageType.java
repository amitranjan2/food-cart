package in.foodcart.service;

/** Identifies an image from its first bytes, so uploads can't smuggle HTML or scripts behind an image name. */
public final class ImageType {
  private ImageType() {}

  /** Returns ".jpg", ".png" or ".webp", or null if the bytes aren't one of those formats. */
  public static String extensionFor(byte[] head, int length) {
    if (head == null) return null;
    if (length >= 3 && (head[0] & 0xFF) == 0xFF && (head[1] & 0xFF) == 0xD8 && (head[2] & 0xFF) == 0xFF) return ".jpg";
    if (length >= 8
        && (head[0] & 0xFF) == 0x89 && head[1] == 'P' && head[2] == 'N' && head[3] == 'G'
        && head[4] == 0x0D && head[5] == 0x0A && head[6] == 0x1A && head[7] == 0x0A) return ".png";
    if (length >= 12
        && head[0] == 'R' && head[1] == 'I' && head[2] == 'F' && head[3] == 'F'
        && head[8] == 'W' && head[9] == 'E' && head[10] == 'B' && head[11] == 'P') return ".webp";
    return null;
  }
}
