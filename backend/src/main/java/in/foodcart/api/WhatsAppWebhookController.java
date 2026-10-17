package in.foodcart.api;

import in.foodcart.service.whatsapp.WhatsAppWebhook;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Meta calls this without a login (WhatsApp Manager → Configure webhooks, Callback URL
 * https://api.suprmama.in/api/whatsapp/webhook, field "messages"). Every POST must carry Meta's signature.
 */
@RestController
@RequestMapping("/api/whatsapp/webhook")
public class WhatsAppWebhookController {
  private final WhatsAppWebhook webhook;

  public WhatsAppWebhookController(WhatsAppWebhook webhook) {
    this.webhook = webhook;
  }

  @GetMapping(produces = MediaType.TEXT_PLAIN_VALUE)
  ResponseEntity<String> verify(@RequestParam(name = "hub.mode", required = false) String mode,
      @RequestParam(name = "hub.verify_token", required = false) String token,
      @RequestParam(name = "hub.challenge", required = false) String challenge) {
    if (!webhook.enabled()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("off");
    String answer = webhook.verify(mode, token, challenge);
    return answer == null ? ResponseEntity.status(HttpStatus.FORBIDDEN).body("forbidden") : ResponseEntity.ok(answer);
  }

  @PostMapping
  ResponseEntity<Map<String, Object>> receive(@RequestBody byte[] rawBody, @RequestHeader(value = "X-Hub-Signature-256", required = false) String signature) {
    if (!webhook.enabled()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "off"));
    if (!webhook.signed(rawBody, signature)) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "bad signature"));
    // Signed over the exact bytes Meta sent, so the body is only decoded after the check.
    return ResponseEntity.ok(Map.of("matched", webhook.handle(new String(rawBody, java.nio.charset.StandardCharsets.UTF_8))));
  }
}
