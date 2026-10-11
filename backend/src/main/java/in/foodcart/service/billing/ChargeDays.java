package in.foodcart.service.billing;

import in.foodcart.data.OrderEntity;
import in.foodcart.data.PaymentInfo;
import in.foodcart.domain.OrderStatus;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.Collection;
import java.util.EnumSet;
import java.util.Set;
import java.util.TreeSet;

/**
 * The days a DAILY stall is charged for (decided Oct 11): an India-time day with at least one order that a real
 * customer paid that day and that wasn't later rejected, cancelled or refunded. A pay-at-stall order counts on the day
 * it was placed, once it was collected and paid (a no-show never counts). Orders from the team's test numbers don't
 * count. Pure.
 */
public final class ChargeDays {
  private ChargeDays() {}

  static final ZoneId INDIA = ZoneId.of("Asia/Kolkata");
  private static final Set<OrderStatus> NOT_SOLD = EnumSet.of(OrderStatus.PAYMENT_PENDING, OrderStatus.EXPIRED, OrderStatus.REJECTED, OrderStatus.CANCELLED, OrderStatus.NO_SHOW);

  public static TreeSet<LocalDate> in(Collection<OrderEntity> orders, YearMonth month, Set<String> testMobiles, LocalDate notBefore) {
    TreeSet<LocalDate> days = new TreeSet<>();
    for (OrderEntity o : orders) {
      if (o.customerMobile != null && testMobiles.contains(o.customerMobile)) continue;
      if (o.cash()) {
        if (o.status != OrderStatus.COMPLETED || o.cashCollectedAt == null || o.createdAt == null) continue;
        LocalDate day = LocalDate.ofInstant(o.createdAt, INDIA);
        if (YearMonth.from(day).equals(month) && !day.isBefore(notBefore)) days.add(day);
        continue;
      }
      if (NOT_SOLD.contains(o.status) || o.payment == null || o.payment.paidAt == null) continue;
      if (o.payment.status != PaymentInfo.Status.PAID) continue; // refunded or refund pending
      if (o.customerMobile != null && testMobiles.contains(o.customerMobile)) continue;
      LocalDate day = LocalDate.ofInstant(o.payment.paidAt, INDIA);
      if (YearMonth.from(day).equals(month) && !day.isBefore(notBefore)) days.add(day);
    }
    return days;
  }
}
