import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
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
import { patchVendorStatus } from '../../api/vendor';
import { isAuthFailure } from '../../api/client';
import { useAuth } from '../../state/AuthContext';
import { spacing } from '../../theme';
import type { OrderStatus } from '../../types';
import { formatDayTitle } from '../../utils/format';
import { futureOrderCount, indiaDay, pagerDayKey } from '../../utils/orderDay';
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

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh(true);
    }, [refresh]),
  );

  const day = useMemo(() => indiaDay(offset), [offset]);

  const shown = useMemo(() => filterOrders(orders, day, 'ALL', ''), [orders, day]);
  // Badge on the next-day arrow, so advance orders aren't missed.
  const futureCount = useMemo(() => futureOrderCount(orders, pagerDayKey(day)), [orders, day]);

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
                  onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })}
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
