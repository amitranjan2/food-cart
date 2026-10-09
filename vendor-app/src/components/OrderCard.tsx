import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import type { Order } from '../types';
import { formatElapsed, formatSlot, rupees } from '../utils/format';
import { formatOrderType, ORDER_LIST_ACTION, orderStatusStartedAt } from '../utils/orderStatus';
import { StatusChip } from './StatusChip';

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
  const isNew = order.status === 'PLACED';

  return (
    <View style={[styles.card, highlighted ? styles.highlighted : null]}>
      <View style={styles.row}>
        <Text style={styles.number}>#{order.orderNumber}</Text>
        <StatusChip status={order.status} />
      </View>
      <View style={[styles.row, styles.customerRow]}>
        <Text style={styles.customer} numberOfLines={1}>
          {[order.customerName, order.customerMobile].filter(Boolean).join(' · ') || 'Customer'}
        </Text>
        {typeLabel ? (
          <View style={styles.type}>
            <Text style={styles.typeLabel}>{typeLabel}</Text>
          </View>
        ) : null}
      </View>
      {slotLabel ? <Text style={styles.slot}>For {slotLabel}</Text> : null}
      <View style={styles.items}>
        {order.items?.map((item, index) => (
          <Text key={`${item.menuItemId ?? 'line'}-${index}`} style={styles.item}>
            {item.quantity}x {item.name}
            {item.portion ? ` (${portionLabel(item.portion)})` : ''}
            {item.summary ? ` · ${item.summary}` : ''}
          </Text>
        ))}
      </View>
      <Text style={styles.total}>{rupees(order.total)}</Text>
      {isNew ? (
        <View style={styles.actionsEnd}>
          <Pressable
            disabled={busy}
            onPress={event => {
              event.stopPropagation();
              onReject?.();
            }}
            style={[styles.reject, busy ? styles.busy : null]}
          >
            <Text style={styles.rejectLabel}>Reject</Text>
          </Pressable>
          <Pressable
            disabled={busy}
            onPress={event => {
              event.stopPropagation();
              onAdvance?.();
            }}
            style={[styles.primary, busy ? styles.busy : null]}
          >
            <Text style={styles.primaryLabel}>{busy ? '…' : `Accept${elapsed ? `(${elapsed})` : ''}`}</Text>
          </Pressable>
        </View>
      ) : action ? (
        <View style={styles.actionsSpread}>
          {elapsed ? (
            <View style={styles.timer}>
              <Text style={styles.timerLabel}>{elapsed}</Text>
            </View>
          ) : (
            <View />
          )}
          <Pressable
            disabled={busy}
            onPress={event => {
              event.stopPropagation();
              onAdvance?.();
            }}
            style={[styles.primary, busy ? styles.busy : null]}
          >
            <Text style={styles.primaryLabel}>{busy ? '…' : action}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function portionLabel(portion: string) {
  const lower = portion.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

const styles = StyleSheet.create({
  slot: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '700',
    color: colors.title,
  },
  highlighted: {
    borderColor: '#1f9d55',
  },
  total: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '800',
    color: colors.title,
  },
  card: {
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    shadowColor: '#101828',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  number: {
    flex: 1,
    color: '#1d2939',
    fontSize: 15,
    fontWeight: '700',
  },
  customerRow: {
    marginTop: 12,
  },
  customer: {
    flex: 1,
    color: '#1d2939',
    fontSize: 15,
    fontWeight: '700',
  },
  type: {
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeLabel: {
    color: '#344054',
    fontSize: 12,
    fontWeight: '600',
  },
  items: {
    marginTop: 8,
    gap: 2,
  },
  item: {
    color: '#667085',
    fontSize: 13,
    lineHeight: 18,
  },
  actionsEnd: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionsSpread: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timer: {
    backgroundColor: '#F2F4F7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  timerLabel: {
    color: '#344054',
    fontSize: 13,
    fontWeight: '700',
  },
  primary: {
    backgroundColor: '#243447',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryLabel: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  reject: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  rejectLabel: {
    color: '#344054',
    fontSize: 13,
    fontWeight: '700',
  },
  busy: {
    opacity: 0.6,
  },
});
