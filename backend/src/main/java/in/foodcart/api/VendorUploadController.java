package in.foodcart.api;

import in.foodcart.service.AuthService;
import in.foodcart.service.ImageType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/vendor/uploads")
public class VendorUploadController {
  private static final long MAX_BYTES = 5_000_000;

  private final AuthService auth;
  private final String directory;
  private final String publicBaseUrl;

  public VendorUploadController(
      AuthService a,
      @Value("${app.upload-dir:uploads}") String directory,
      @Value("${app.public-base-url}") String publicBaseUrl) {
    auth = a;
    this.directory = directory;
    this.publicBaseUrl = publicBaseUrl.replaceAll("/+$", "");
  }

  @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public Map<String, String> upload(@RequestHeader("Authorization") String h, @RequestParam("file") MultipartFile file) throws Exception {
    auth.actor(h, "VENDOR");
    if (file.isEmpty() || file.getSize() > MAX_BYTES) throw new IllegalArgumentException("Upload a JPG, PNG or WebP image under 5 MB.");
    byte[] head = new byte[12];
    int read;
    try (InputStream in = file.getInputStream()) {
      read = in.readNBytes(head, 0, head.length);
    }
    // Trust the file's bytes, not the name or content type the client sent.
    String extension = ImageType.extensionFor(head, read);
    if (extension == null) throw new IllegalArgumentException("Upload a JPG, PNG or WebP image under 5 MB.");
    Files.createDirectories(Path.of(directory));
    String name = UUID.randomUUID() + extension;
    try (InputStream in = file.getInputStream()) {
      Files.copy(in, Path.of(directory, name));
    }
    return Map.of("url", publicBaseUrl + "/uploads/" + name);
  }
}
