import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Header } from '../../components/Header';
import { LoadingState } from '../../components/LoadingState';
import { Screen } from '../../components/Screen';
import { StatusChip } from '../../components/StatusChip';
import { useOrders } from '../../hooks/useOrders';
import { isAuthFailure } from '../../api/client';
import { useAuth } from '../../state/AuthContext';
import { colors, spacing } from '../../theme';
import { formatSlot, rupees } from '../../utils/format';
import { formatOrderType, ORDER_DETAIL_ACTION } from '../../utils/orderStatus';
import type { OrdersStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OrdersStackParamList, 'OrderDetails'>;

export function OrderDetailsScreen({ navigation, route }: Props) {
  const { orderId } = route.params;
  const { logout } = useAuth();
  const { orders, loading, refresh, advanceStatus } = useOrders();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      refresh(true);
    }, [refresh]),
  );

  const order = orders.find(item => item.id === orderId);
  const action = order ? ORDER_DETAIL_ACTION[order.status] : undefined;

  async function advance() {
    if (!order || busyRef.current) return;
    busyRef.current = true;
    try {
      setBusy(true);
      setError('');
      const result = await advanceStatus(order);
      if (result?.reconciled) return;
      const fetched = result?.fetched;
      if (fetched && result?.patched && fetched.status !== result.patched.status) {
        setError('Status was updated, but GET /api/vendor/orders did not return the new status.');
      }
    } catch (e) {
      if (isAuthFailure(e)) await logout();
      else setError(e instanceof Error ? e.message : 'Could not update order');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <Screen>
      <StatusBar style="light" />
      <Header
        title={order ? `ORDER #${order.orderNumber}` : 'ORDER'}
        left={
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backLabel}>← BACK</Text>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.body}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.all}>← ALL ORDERS</Text>
        </Pressable>
        <View style={styles.dateBar}>
          <Text style={styles.dateTitle}>ORDER DETAILS</Text>
        </View>
        {loading && !order ? (
          <LoadingState message="Loading order…" />
        ) : !order ? (
          <View style={styles.missing}>
            <Text style={styles.missingText}>This order is no longer available.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.number}>#{order.orderNumber}</Text>
              <StatusChip status={order.status} />
            </View>
            <View style={[styles.row, styles.meta]}>
              <Text style={styles.phone}>☎ {[order.customerName, order.customerMobile].filter(Boolean).join(' · ') || 'Customer'}</Text>
              {order.type ? (
                <View style={styles.type}>
                  <Text style={styles.typeLabel}>{formatOrderType(order.type)}</Text>
                </View>
              ) : null}
            </View>
            {order.scheduledFor ? <Text style={styles.slot}>For {formatSlot(order.scheduledFor)}</Text> : null}
            <View style={styles.items}>
              {order.items?.map((item, index) => (
                <Text key={`${item.menuItemId ?? 'line'}-${index}`} style={styles.item}>
                  {item.quantity}x {item.name} ({item.portion || 'FULL'})
                  {item.summary ? ` · ${item.summary}` : ''} · {rupees(item.lineTotal)}
                </Text>
              ))}
            </View>
            <View style={styles.footer}>
              <Text style={styles.total}>{rupees(order.total)}</Text>
              {action ? (
                <Pressable disabled={busy} onPress={advance} style={styles.action}>
                  <Text style={styles.actionLabel}>{busy ? 'UPDATING…' : action}</Text>
                </Pressable>
              ) : null}
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  slot: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '700',
    color: colors.title,
  },
  back: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  backLabel: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  body: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  all: {
    marginBottom: 16,
    fontSize: 12,
    fontWeight: '700',
    color: colors.header,
  },
  dateBar: {
    backgroundColor: '#bfddf7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  dateTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.header,
  },
  missing: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 20,
  },
  missingText: {
    fontSize: 13,
    color: colors.ink,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#64748b',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  number: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.title,
  },
  meta: {
    marginTop: 12,
  },
  phone: {
    fontSize: 13,
    textDecorationLine: 'underline',
    color: colors.ink,
  },
  type: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.ink,
  },
  items: {
    marginTop: 12,
    gap: 4,
  },
  item: {
    fontSize: 12,
    lineHeight: 18,
    color: '#475569',
  },
  footer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  total: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.title,
  },
  action: {
    backgroundColor: colors.header,
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  actionLabel: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  error: {
    marginTop: 10,
    color: colors.error,
    fontSize: 12,
    fontWeight: '600',
  },
});
