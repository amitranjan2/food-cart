import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, typography } from '../theme';
import type { Order } from '../types';
import { Badge, Button, Card } from '../ui';
import { formatElapsed, formatSlot, rupees } from '../utils/format';
import { canMarkNoShow, formatOrderType, ORDER_BADGE, ORDER_LIST_ACTION, orderStatusStartedAt, paysAtStall } from '../utils/orderStatus';

export function OrderCard({
  order,
  busy,
  now,
  highlighted,
  onAdvance,
  onReject,
  onNoShow,
}: {
  order: Order;
  busy?: boolean;
  now: number;
  /** Briefly outlined when the vendor arrives here from the new-order banner. */
  highlighted?: boolean;
  onAdvance?: () => void;
  onReject?: () => void;
  /** Pay-at-stall orders, 30 minutes after the pickup time. */
  onNoShow?: () => void;
}) {
  const atStall = paysAtStall(order);
  const noShow = onNoShow && canMarkNoShow(order, now);
  const action = ORDER_LIST_ACTION[order.status];
  const elapsed = formatElapsed(orderStatusStartedAt(order), now);
  const typeLabel = formatOrderType(order.type);
  const slotLabel = formatSlot(order.scheduledFor, now);
  const badge = ORDER_BADGE[order.status];
  const isNew = order.status === 'PLACED';

  return (
    <Card style={[styles.card, highlighted ? styles.highlighted : null]}>
      <View style={styles.row}>
        <Text style={typography.heading}>#{order.orderNumber}</Text>
        <View style={styles.badges}>
          {order.subscriptionId ? <Badge label="Weekly" /> : null}
          <Badge label={badge.label} tone={badge.tone} />
        </View>
      </View>
      <View style={styles.row}>
        <Text style={[typography.bodyStrong, styles.customer]} numberOfLines={1}>
          {[order.customerName, order.customerMobile].filter(Boolean).join(' · ') || 'Customer'}
        </Text>
        {typeLabel ? <Badge label={typeLabel} /> : null}
      </View>
      {slotLabel ? <Text style={styles.slot}>For {slotLabel}</Text> : null}
      <View style={styles.items}>
        {order.items?.map((item, index) => (
          <Text key={`${item.menuItemId ?? 'line'}-${index}`} style={styles.item}>
            {item.quantity}× {item.name}
            {item.portion ? ` (${portionLabel(item.portion)})` : ''}
            {item.summary ? ` · ${item.summary}` : ''}
          </Text>
        ))}
      </View>
      {/* The stall's own prices; the customer also paid GST and platform charges, which aren't the stall's. */}
      <View style={styles.row}>
        <Text style={typography.heading} accessibilityLabel={`Item total ${rupees(order.subtotal ?? order.total)}`}>{rupees(order.subtotal ?? order.total)}</Text>
        {/* Pay at the stall: the customer pays the full bill (items + GST) here; the GST part is ours (monthly statement). */}
        {atStall && order.status !== 'REJECTED' && order.status !== 'CANCELLED' && order.status !== 'NO_SHOW' ? (
          <Badge label={order.status === 'COMPLETED' ? `Collected ${rupees(order.total)}` : `Collect ${rupees(order.total)}`} tone={order.status === 'COMPLETED' ? 'success' : 'warning'} />
        ) : !atStall ? (
          <Badge label="Paid online" tone="success" />
        ) : null}
      </View>
      {action ? (
        <View style={styles.actions}>
          {isNew ? (
            <Button label="Reject" variant="secondary" size="sm" disabled={busy} onPress={onReject} />
          ) : elapsed ? (
            <View style={styles.timer} accessibilityLabel={`${elapsed} in this step`}>
              <Text style={styles.timerLabel}>{elapsed}</Text>
            </View>
          ) : (
            <View />
          )}
          <View style={styles.buttons}>
            {noShow ? <Button label="Didn't come" variant="quiet" size="sm" disabled={busy} onPress={onNoShow} /> : null}
            <Button label={isNew && elapsed ? `${action} · ${elapsed}` : action} size="sm" busy={busy} onPress={onAdvance} />
          </View>
        </View>
      ) : null}
    </Card>
  );
}

function portionLabel(portion: string) {
  const lower = portion.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  card: {
    gap: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  highlighted: {
    borderColor: colors.success,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  customer: {
    flex: 1,
  },
  slot: {
    ...typography.bodyStrong,
    fontSize: 15,
  },
  items: {
    gap: 2,
  },
  item: {
    ...typography.small,
  },
  actions: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timer: {
    backgroundColor: colors.tint,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    minHeight: 36,
    justifyContent: 'center',
  },
  timerLabel: {
    ...typography.bodyStrong,
    fontSize: 13,
  },
});
