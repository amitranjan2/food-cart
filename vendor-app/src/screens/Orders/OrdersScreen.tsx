import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomNav } from '../../components/BottomNav';
import { DatePager } from '../../components/DatePager';
import { DrawerMenu } from '../../components/DrawerMenu';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { Header } from '../../components/Header';
import { LoadingState } from '../../components/LoadingState';
import { HandoverSheet } from '../../components/HandoverSheet';
import { OrderCard } from '../../components/OrderCard';
import { Screen } from '../../components/Screen';
import { MenuPanel } from '../Menu/MenuPanel';
import { StoreSwitch } from '../../components/StoreSwitch';
import { filterOrders, useOrders } from '../../hooks/useOrders';
import { useNewOrderAlert } from '../../hooks/useNewOrderAlert';
import { patchVendorStatus } from '../../api/vendor';
import { isAuthFailure } from '../../api/client';
import { useAuth } from '../../state/AuthContext';
import { spacing } from '../../theme';
import type { Order, OrderStatus } from '../../types';
import { formatDayTitle, formatSlot } from '../../utils/format';
import { futureOrderCount, indiaDay, orderDayKey, pagerDayKey } from '../../utils/orderDay';
import type { OrdersStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OrdersStackParamList, 'OrdersList'>;

export function OrdersScreen({ navigation }: Props) {
  const { vendor, token, logout, setVendor } = useAuth();
  const { orders, loading, refreshing, error, refresh, advanceStatus, handOver } = useOrders();
  const [handoverId, setHandoverId] = useState<string | null>(null);
  const handoverOrder = orders.find(item => item.id === handoverId);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState<'menu' | 'orders'>('orders');
  const [offset, setOffset] = useState(0);
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const busyRef = useRef(false);
  const listRef = useRef<FlatList<Order>>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh(true);
    }, [refresh]),
  );

  // Check for new orders every 10 s while the app is open (also while an order's details are open on top),
  // and straight away when the app comes back to the foreground. Push notifications come later.
  useEffect(() => {
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') refresh(true, true);
    }, POLL_MS);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refresh(true, true);
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [refresh]);

  const alert = useNewOrderAlert(orders, !loading);

  /** From the new-order notice in the header: open the order's slot day and scroll to its card, outlined for a moment. */
  function showInList(order: Order) {
    const days = Math.round((Date.parse(orderDayKey(order)) - Date.parse(pagerDayKey(indiaDay(0)))) / 86_400_000);
    setTab('orders');
    setOffset(days);
    setHighlightId(order.id);
  }

  const day = useMemo(() => indiaDay(offset), [offset]);

  const shown = useMemo(() => filterOrders(orders, day, 'ALL', ''), [orders, day]);
  // Badge on the next-day arrow, so advance orders aren't missed.
  const futureCount = useMemo(() => futureOrderCount(orders, pagerDayKey(day)), [orders, day]);

  // Scroll to the order picked from the header notice once its day is showing; runs when the target or day changes,
  // not on every 10 s refresh.
  useEffect(() => {
    if (!highlightId) return;
    const index = shown.findIndex(order => order.id === highlightId);
    if (index >= 0) setTimeout(() => listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.1 }), 50);
    const timer = setTimeout(() => setHighlightId(null), 2500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightId, offset]);

  async function toggleStore() {
    if (!token || !vendor) return;
    try {
      const saved = await patchVendorStatus(token, vendor.status === 'OPEN' ? 'CLOSED' : 'OPEN');
      setVendor(saved);
    } catch (e) {
      if (isAuthFailure(e)) await logout();
      else setActionError(e instanceof Error ? e.message : 'Could not update store status');
    }
  }

  async function advance(orderId: string, target?: OrderStatus) {
    if (busyRef.current) return;
    const order = orders.find(item => item.id === orderId);
    if (!order) return;
    busyRef.current = true;
    setBusyId(orderId);
    try {
      setActionError('');
      await advanceStatus(order, target);
    } catch (e) {
      if (isAuthFailure(e)) await logout();
      else setActionError(e instanceof Error ? e.message : 'Could not update order');
    } finally {
      busyRef.current = false;
      setBusyId(null);
    }
  }

  if (!vendor) return null;

  return (
    <Screen style={tab === 'orders' ? styles.canvas : undefined}>
      <StatusBar style="light" />
      <Header
        title={vendor.name}
        onMenuPress={() => setMenuOpen(open => !open)}
        right={<StoreSwitch open={vendor.status === 'OPEN'} onToggle={toggleStore} />}
        notice={
          alert.latest
            ? {
                title: `🔔 New order #${alert.latest.orderNumber}`,
                detail: [alert.latest.customerName, formatSlot(alert.latest.scheduledFor, now), 'tap to view'].filter(Boolean).join(' · '),
                onPress: () => {
                  const order = alert.latest;
                  alert.dismiss();
                  if (order) showInList(order);
                },
              }
            : undefined
        }
      />
      {menuOpen ? (
        <>
          <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)} />
          <DrawerMenu
            vendor={vendor}
            onSettings={() => {
              setMenuOpen(false);
              navigation.navigate('Settings');
            }}
            onLogout={() => {
              setMenuOpen(false);
              logout();
            }}
          />
        </>
      ) : null}

      {tab === 'orders' ? (
        <View style={styles.body}>
          <DatePager
            title={formatDayTitle(offset, day)}
            onPrev={() => setOffset(value => value - 1)}
            onNext={() => setOffset(value => value + 1)}
            nextCount={futureCount}
          />
          {actionError ? <Text style={styles.actionError}>{actionError}</Text> : null}
          {loading && orders.length === 0 ? (
            <LoadingState message="Loading orders…" />
          ) : error ? (
            <ErrorState message={error} />
          ) : (
            <FlatList
              ref={listRef}
              onScrollToIndexFailed={info => listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true })}
              data={shown}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.list}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => refresh(true)} tintColor="#243447" />
              }
              ListEmptyComponent={
                <EmptyState
                  message={orders.length > 0 ? 'No orders for this day.' : 'No orders yet.'}
                />
              }
              renderItem={({ item }) => (
                <OrderCard
                  order={item}
                  busy={busyId === item.id}
                  now={now}
                  highlighted={highlightId === item.id}
                  onAdvance={() => (item.status === 'READY' ? setHandoverId(item.id) : advance(item.id))}
                  onReject={() => advance(item.id, 'REJECTED')}
                />
              )}
            />
          )}
        </View>
      ) : (
        <MenuPanel />
      )}
      <BottomNav tab={tab} onChange={setTab} />
      {handoverOrder ? (
        <HandoverSheet
          order={handoverOrder}
          onClose={() => setHandoverId(null)}
          onSubmit={async code => {
            await handOver(handoverOrder, code);
            setHandoverId(null);
          }}
        />
      ) : null}
    </Screen>
  );
}

const POLL_MS = 10_000;

const styles = StyleSheet.create({
  canvas: {
    backgroundColor: '#F4F6F8',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    top: 62,
    zIndex: 9,
  },
  body: {
    flex: 1,
    padding: spacing.md,
    paddingBottom: 84,
  },
  actionError: {
    color: '#d8424a',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  list: {
    gap: 12,
    paddingBottom: 24,
  },
});
