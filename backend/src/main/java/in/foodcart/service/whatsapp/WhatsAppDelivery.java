package in.foodcart.service.whatsapp;

import in.foodcart.data.WhatsAppMessageEntity;
import in.foodcart.data.WhatsAppMessageEntity.Status;
import in.foodcart.data.WhatsAppMessageRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.*;
import java.util.*;

/**
 * Delivery tracking for the WhatsApp messages we send (tracker N3): the sender records each message id, Meta's webhook
 * moves it through sent → delivered → read (or failed), and the admin API summarises it.
 */
@Service
public class WhatsAppDelivery {
  private static final Logger log = LoggerFactory.getLogger(WhatsAppDelivery.class);
  public static final Duration KEEP = Duration.ofDays(30);
  private static final ZoneId INDIA = ZoneId.of("Asia/Kolkata");

  private final WhatsAppMessageRepository messages;
  private final Clock clock;

  @Autowired
  public WhatsAppDelivery(WhatsAppMessageRepository messages) {
    this(messages, Clock.systemUTC());
  }

  WhatsAppDelivery(WhatsAppMessageRepository messages, Clock clock) {
    this.messages = messages;
    this.clock = clock;
  }

  /** Called right after Meta accepted a message. Never throws: tracking must not break a login. */
  public void sent(String messageId, String mobile, String purpose) {
    if (messageId == null || messageId.isBlank()) return;
    try {
      WhatsAppMessageEntity m = new WhatsAppMessageEntity();
      m.id = messageId;
      m.mobile = mobile;
      m.purpose = purpose;
      m.sentAt = clock.instant();
      m.statusAt = m.sentAt;
      m.purgeAt = m.sentAt.plus(KEEP);
      messages.save(m);
    } catch (RuntimeException e) {
      log.warn("Could not record a WhatsApp message for delivery tracking: {}", e.toString());
    }
  }

  /** One status from Meta's webhook. Returns false when the message isn't ours (e.g. sent from WhatsApp Manager). */
  public boolean status(String messageId, String status, Instant at, Integer errorCode, String errorTitle) {
    Status next = parse(status);
    if (next == null || messageId == null) return false;
    Optional<WhatsAppMessageEntity> found = messages.findById(messageId);
    if (found.isEmpty()) return false;
    WhatsAppMessageEntity m = found.get();
    Instant when = at == null ? clock.instant() : at;
    switch (next) {
      case DELIVERED -> m.deliveredAt = m.deliveredAt == null ? when : m.deliveredAt;
      case READ -> {
        m.readAt = m.readAt == null ? when : m.readAt;
        // "read" implies delivered, even if that webhook was lost or comes later.
        if (m.deliveredAt == null) m.deliveredAt = when;
      }
      case FAILED -> {
        m.failedAt = when;
        m.errorCode = errorCode;
        m.errorTitle = errorTitle;
      }
      default -> {}
    }
    // Webhooks can arrive out of order: only move forward (failed is final).
    if (m.status != Status.FAILED && (next == Status.FAILED || next.ordinal() > m.status.ordinal())) {
      m.status = next;
      m.statusAt = when;
    }
    messages.save(m);
    if (next == Status.FAILED) log.warn("WhatsApp message failed: Meta error {} {}", errorCode, errorTitle);
    return true;
  }

  static Status parse(String status) {
    if (status == null) return null;
    return switch (status.toLowerCase(Locale.ROOT)) {
      case "sent" -> Status.SENT;
      case "delivered" -> Status.DELIVERED;
      case "read" -> Status.READ;
      case "failed" -> Status.FAILED;
      default -> null;
    };
  }

  /** Per India day for the last `days` days, newest first, plus the reasons messages failed. */
  public Map<String, Object> stats(int days) {
    int span = Math.max(1, Math.min(days, 30));
    LocalDate today = LocalDate.now(clock.withZone(INDIA));
    LocalDate first = today.minusDays(span - 1L);
    Instant from = first.atStartOfDay(INDIA).toInstant();
    Map<LocalDate, long[]> byDay = new TreeMap<>(Comparator.reverseOrder());
    for (LocalDate d = first; !d.isAfter(today); d = d.plusDays(1)) byDay.put(d, new long[5]);
    Map<String, Long> failures = new TreeMap<>();
    long[] total = new long[5];
    for (WhatsAppMessageEntity m : messages.findBySentAtAfter(from.minusMillis(1))) {
      long[] row = byDay.get(m.sentAt.atZone(INDIA).toLocalDate());
      if (row == null) continue;
      int i = bucket(m);
      row[i]++;
      total[i]++;
      if (m.status == Status.FAILED) failures.merge((m.errorCode == null ? "?" : m.errorCode) + " " + (m.errorTitle == null ? "" : m.errorTitle), 1L, Long::sum);
    }
    List<Map<String, Object>> rows = new ArrayList<>();
    byDay.forEach((day, row) -> rows.add(row(day.toString(), row)));
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("days", span);
    out.put("total", row(null, total));
    out.put("byDay", rows);
    out.put("failures", failures);
    return out;
  }

  /** Where the last few messages to one number got to, for "my code never came". */
  public List<Map<String, Object>> lookup(String mobile) {
    List<Map<String, Object>> out = new ArrayList<>();
    for (WhatsAppMessageEntity m : messages.findTop10ByMobileOrderBySentAtDesc(mobile)) {
      Map<String, Object> row = new LinkedHashMap<>();
      row.put("sentAt", m.sentAt);
      row.put("purpose", m.purpose);
      row.put("status", m.status);
      row.put("deliveredAt", m.deliveredAt);
      row.put("readAt", m.readAt);
      row.put("errorCode", m.errorCode);
      row.put("errorTitle", m.errorTitle);
      out.add(row);
    }
    return out;
  }

  /** 0 pending (accepted or sent, no answer yet), 1 delivered, 2 read, 3 failed. */
  private static int bucket(WhatsAppMessageEntity m) {
    return switch (m.status) {
      case DELIVERED -> 1;
      case READ -> 2;
      case FAILED -> 3;
      default -> 0;
    };
  }

  private static Map<String, Object> row(String day, long[] r) {
    long sent = r[0] + r[1] + r[2] + r[3];
    Map<String, Object> out = new LinkedHashMap<>();
    if (day != null) out.put("day", day);
    out.put("sent", sent);
    out.put("delivered", r[1] + r[2]);
    out.put("read", r[2]);
    out.put("failed", r[3]);
    out.put("pending", r[0]);
    out.put("deliveredPercent", sent == 0 ? null : Math.round((r[1] + r[2]) * 1000.0 / sent) / 10.0);
    return out;
  }
}
