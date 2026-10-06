import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { deleteMenuItem, getVendorMenu, patchItemAvailability } from '../../api/menu';
import { isAuthFailure, mediaUrl } from '../../api/client';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { useFrameOverlay } from '../../components/Screen';
import { useAuth } from '../../state/AuthContext';
import { colors } from '../../theme';
import type { FoodType, MenuCategory, MenuItem } from '../../types';
import { DishFormSheet, type DishFormMode } from './DishFormSheet';
import {
  CopyDishIcon,
  DeleteDishIcon,
  EditDishIcon,
  PauseDishIcon,
} from '../../components/icons/MenuActionIcons';
import { rupees } from '../../utils/format';

const FOOD_FILTERS: { value: FoodType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'ALL' },
  { value: 'VEG', label: 'VEG' },
  { value: 'NON_VEG', label: 'NON VEG' },
  { value: 'EGG', label: 'EGG' },
  { value: 'OTHER', label: 'OTHER' },
];

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All status' },
  { value: 'LIVE', label: 'Live only' },
  { value: 'SOLD_OUT', label: 'Sold out' },
] as const;

type Availability = (typeof STATUS_FILTERS)[number]['value'];

type SheetState = {
  mode: DishFormMode;
  item?: MenuItem;
};

export function MenuPanel() {
  const { token, logout } = useAuth();
  const setOverlay = useFrameOverlay();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [food, setFood] = useState<FoodType | 'ALL'>('ALL');
  const [availability, setAvailability] = useState<Availability>('ALL');
  const [statusOpen, setStatusOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<MenuItem | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setError('');
    try {
      const menu = await getVendorMenu(token);
      setItems(menu.items ?? []);
      setCategories(menu.categories ?? []);
    } catch (e) {
      if (isAuthFailure(e)) {
        await logout();
        return;
      }
      setError(e instanceof Error ? e.message : 'Could not load menu');
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    if (!sheet) {
      setOverlay(null);
      return;
    }
    setOverlay(
      <DishFormSheet
        key={sheet.item ? `${sheet.mode}-${sheet.item.id}` : 'add'}
        mode={sheet.mode}
        item={sheet.item}
        categories={categories}
        onClose={() => setSheet(null)}
        onSaved={() => load()}
      />,
    );
  }, [sheet, categories, load, setOverlay]);

  useEffect(() => () => setOverlay(null), [setOverlay]);

  const shown = items.filter(item => {
    if (food !== 'ALL' && item.foodType !== food) return false;
    if (availability === 'LIVE' && !item.available) return false;
    if (availability === 'SOLD_OUT' && item.available) return false;
    return item.name.toLowerCase().includes(query.trim().toLowerCase());
  });

  async function removeItem(item: MenuItem) {
    if (!token) return;
    try {
      await deleteMenuItem(token, item.id);
      setItems(current => current.filter(entry => entry.id !== item.id));
    } catch (e) {
      if (isAuthFailure(e)) await logout();
      else setError(e instanceof Error ? e.message : 'Could not remove dish');
    }
  }

  function remove(item: MenuItem) {
    setPendingDelete(item);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const item = pendingDelete;
    setPendingDelete(null);
    await removeItem(item);
  }

  async function pause(item: MenuItem) {
    if (!token) return;
    try {
      const saved = await patchItemAvailability(token, item.id, !item.available);
      setItems(current => current.map(entry => (entry.id === saved.id ? saved : entry)));
    } catch (e) {
      if (isAuthFailure(e)) await logout();
      else setError(e instanceof Error ? e.message : 'Could not update availability');
    }
  }

  return (
    <View style={styles.body}>
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.kicker}>MENU · LIVE CATALOGUE</Text>
          <Text style={styles.title}>Your dishes</Text>
        </View>
        <Pressable onPress={() => setSheet({ mode: 'add' })} style={styles.add}>
          <Text style={styles.addLabel}>+ Dish</Text>
        </Pressable>
      </View>
      <View style={styles.tools}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search dishes"
          placeholderTextColor="#8aa0b2"
          style={styles.search}
        />
        <Pressable onPress={() => setStatusOpen(open => !open)} style={styles.status}>
          <Text style={styles.statusLabel} numberOfLines={1}>
            {STATUS_FILTERS.find(option => option.value === availability)?.label}
          </Text>
        </Pressable>
      </View>
      {statusOpen ? (
        <View style={styles.statusList}>
          {STATUS_FILTERS.map(option => (
            <Pressable
              key={option.value}
              onPress={() => {
                setAvailability(option.value);
                setStatusOpen(false);
              }}
              style={styles.statusOption}
            >
              <Text style={styles.statusLabel}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filters}
      >
        {FOOD_FILTERS.map(option => {
          const active = food === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setFood(option.value)}
              style={[styles.filter, active && styles.filterActive]}
            >
              <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading && items.length === 0 ? (
        <LoadingState message="Loading menu…" />
      ) : error && items.length === 0 ? (
        <ErrorState message={error} />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState message="No dishes match these filters." />}
          renderItem={({ item }) => {
            const types = item.halfPrice != null ? 2 : 1;
            return (
              <View style={[styles.card, !item.available && styles.cardOff]}>
                <View style={styles.photoWrap}>
                  {mediaUrl(item.imageUrl) ? (
                    <Image source={{ uri: mediaUrl(item.imageUrl) }} style={styles.photo} />
                  ) : (
                    <View style={styles.photo} />
                  )}
                  <View style={styles.priceBadge}>
                    <Text style={styles.price}>{rupees(item.price)}</Text>
                  </View>
                </View>
                <View style={styles.copy}>
                  <View style={styles.nameRow}>
                    <FoodMark foodType={item.foodType} />
                    <Text style={styles.name} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                  <Text style={styles.description} numberOfLines={2}>
                    {item.description || 'Freshly prepared at the counter'}
                  </Text>
                  <View style={styles.footer}>
                    <Text style={styles.types}>
                      {types} {types === 1 ? 'TYPE' : 'TYPES'}
                    </Text>
                    <View style={styles.iconRow}>
                      <Pressable
                        accessibilityLabel="Edit dish"
                        onPress={() => setSheet({ mode: 'edit', item })}
                        style={styles.iconButton}
                      >
                        <EditDishIcon />
                      </Pressable>
                      <Pressable
                        accessibilityLabel="Duplicate dish"
                        onPress={() => setSheet({ mode: 'add', item })}
                        style={styles.iconButton}
                      >
                        <CopyDishIcon />
                      </Pressable>
                      <Pressable
                        accessibilityLabel={item.available ? `Pause ${item.name}` : `Resume ${item.name}`}
                        onPress={() => pause(item)}
                        style={styles.iconButton}
                      >
                        <PauseDishIcon color={item.available ? '#667085' : '#E53935'} />
                      </Pressable>
                      <Pressable accessibilityLabel={`Remove ${item.name}`} onPress={() => remove(item)} style={styles.iconButton}>
                        <DeleteDishIcon />
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
      {pendingDelete ? (
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Remove dish</Text>
            <Text style={styles.confirmCopy}>Remove {pendingDelete.name} from your menu?</Text>
            <View style={styles.confirmActions}>
              <Pressable onPress={() => setPendingDelete(null)} style={styles.confirmCancel}>
                <Text style={styles.confirmCancelLabel}>Cancel</Text>
              </Pressable>
              <Pressable onPress={confirmDelete} style={styles.confirmRemove}>
                <Text style={styles.confirmRemoveLabel}>Remove</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function FoodMark({ foodType }: { foodType?: string }) {
  const color = foodType === 'NON_VEG' ? colors.nonVeg : foodType === 'EGG' ? '#e0a100' : foodType === 'OTHER' ? colors.muted : colors.veg;
  return (
    <View style={[styles.mark, { borderColor: color }]}>
      <View style={[styles.markDot, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    padding: 13,
    paddingBottom: 84,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 13,
  },
  kicker: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.muted,
  },
  title: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: '700',
    color: colors.title,
    letterSpacing: -1,
  },
  add: {
    backgroundColor: colors.header,
    borderRadius: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addLabel: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  tools: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 8,
  },
  search: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 4,
    paddingHorizontal: 9,
    paddingVertical: 9,
    fontSize: 11,
    color: '#51697c',
  },
  status: {
    width: 105,
    backgroundColor: colors.white,
    borderRadius: 4,
    justifyContent: 'center',
    paddingHorizontal: 9,
  },
  statusLabel: {
    fontSize: 11,
    color: '#51697c',
  },
  statusList: {
    backgroundColor: colors.white,
    borderRadius: 4,
    marginBottom: 8,
  },
  statusOption: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  filterScroll: {
    height: 34,
    flexGrow: 0,
    marginBottom: 12,
  },
  filters: {
    gap: 6,
    alignItems: 'center',
  },
  filter: {
    backgroundColor: colors.filterBg,
    borderRadius: 4,
    paddingHorizontal: 10,
    height: 32,
    justifyContent: 'center',
  },
  filterActive: {
    backgroundColor: colors.header,
  },
  filterLabel: {
    color: '#50687b',
    fontSize: 10,
    fontWeight: '700',
  },
  filterLabelActive: {
    color: colors.white,
  },
  error: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  list: {
    gap: 12,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#E7F3FC',
    borderRadius: 16,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardOff: {
    opacity: 0.55,
  },
  photoWrap: {
    width: 84,
    height: 84,
  },
  photo: {
    width: 84,
    height: 84,
    borderRadius: 12,
    backgroundColor: '#c7def2',
  },
  priceBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    backgroundColor: '#243447',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  price: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  copy: {
    flex: 1,
    minHeight: 84,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mark: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  name: {
    flex: 1,
    color: '#1d2939',
    fontSize: 16,
    fontWeight: '700',
  },
  description: {
    marginTop: 4,
    color: '#667085',
    fontSize: 12,
    lineHeight: 16,
  },
  footer: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  types: {
    color: '#2F6BFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(29, 41, 57, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 20,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
  },
  confirmTitle: {
    color: '#1d2939',
    fontSize: 16,
    fontWeight: '700',
  },
  confirmCopy: {
    marginTop: 8,
    color: '#667085',
    fontSize: 13,
    lineHeight: 18,
  },
  confirmActions: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  confirmCancel: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F2F4F7',
  },
  confirmCancelLabel: {
    color: '#344054',
    fontSize: 13,
    fontWeight: '700',
  },
  confirmRemove: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#E53935',
  },
  confirmRemoveLabel: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
});
