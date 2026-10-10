import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, typography } from '../theme';
import type { Order } from '../types';
import { Badge, Button, Card } from '../ui';
import { formatElapsed, formatSlot, rupees } from '../utils/format';
import { formatOrderType, ORDER_BADGE, ORDER_LIST_ACTION, orderStatusStartedAt } from '../utils/orderStatus';

export function OrderCard({
  order,
  busy,
  now,
  highlighted,
  onAdvance,
  onReject,
}: {
  order: Order;
  busy?: boolean;
  now: number;
  /** Briefly outlined when the vendor arrives here from the new-order banner. */
  highlighted?: boolean;
  onAdvance?: () => void;
  onReject?: () => void;
}) {
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
        <Badge label={badge.label} tone={badge.tone} />
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
      <Text style={typography.heading}>{rupees(order.total)}</Text>
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
          <Button label={isNew && elapsed ? `${action} · ${elapsed}` : action} size="sm" busy={busy} onPress={onAdvance} />
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
