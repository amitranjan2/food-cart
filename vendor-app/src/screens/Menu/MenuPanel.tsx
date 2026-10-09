import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { deleteMenuItem, getVendorMenu, patchItemAvailability, patchItemSpecial, putCategoryOrder, putItemOrder } from '../../api/menu';
import { isAuthFailure, mediaUrl } from '../../api/client';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { useFrameOverlay } from '../../components/Screen';
import { useAuth } from '../../state/AuthContext';
import { colors } from '../../theme';
import type { FoodType, MenuCategory, MenuItem } from '../../types';
import { ArrangeSheet, type ArrangeRow } from './ArrangeSheet';
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
  { value: 'VEGAN', label: 'VEGAN' },
  { value: 'VEG', label: 'VEG' },
  { value: 'NON_VEG', label: 'NON VEG' },
  { value: 'EGG', label: 'EGG' },
  { value: 'OTHER', label: 'OTHER' },
];

function typeCount(item: MenuItem) {
  const defined = [
    item.sizes?.length ?? 0,
    ...(item.variants ?? []).map(variant => variant.options?.length ?? 0),
  ].filter(count => count > 0);
  if (defined.length === 0) return 1;
  return defined.reduce((total, count) => total * count, 1);
}

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
  const [arranging, setArranging] = useState<{ categoryId: string | null; name: string } | 'categories' | null>(null);

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

  async function toggleSpecial(item: MenuItem) {
    if (!token) return;
    try {
      const saved = await patchItemSpecial(token, item.id, !item.special);
      setItems(current => current.map(entry => (entry.id === saved.id ? saved : entry)));
    } catch (e) {
      if (isAuthFailure(e)) await logout();
      else setError(e instanceof Error ? e.message : 'Could not update specials');
    }
  }

  async function saveOrder(ids: string[]) {
    if (!token) return;
    if (arranging === 'categories') await putCategoryOrder(token, ids);
    else await putItemOrder(token, ids);
    setArranging(null);
    await load();
  }

  // The list is grouped like the storefront: categories in the vendor's order, dishes in their order inside each.
  const known = new Set(categories.map(category => category.id));
  const sections = [
    ...categories.map(category => ({ id: category.id as string | null, name: category.name })),
    { id: null, name: 'Other' },
  ]
    .map(category => {
      const inCategory = (item: MenuItem) => (category.id ? item.categoryId === category.id : !item.categoryId || !known.has(item.categoryId));
      return { ...category, total: items.filter(inCategory).length, data: shown.filter(inCategory) };
    })
    .filter(section => section.data.length > 0);

  function arrangeRows(): ArrangeRow[] {
    if (arranging === 'categories') {
      return categories.map(category => {
        const count = items.filter(item => item.categoryId === category.id).length;
        return { id: category.id, name: category.name, detail: count === 0 ? 'No dishes' : `${count} ${count === 1 ? 'dish' : 'dishes'}`, dimmed: count === 0 };
      });
    }
    const section = sections.find(entry => entry.id === arranging?.categoryId);
    const dishes = items.filter(item => (section?.id ? item.categoryId === section.id : !item.categoryId || !known.has(item.categoryId)));
    return dishes.map(item => ({
      id: item.id,
      name: item.name,
      detail: [rupees(item.price), item.special ? '★ Special' : '', item.available ? '' : 'Paused'].filter(Boolean).join(' · '),
      dimmed: !item.available,
    }));
  }

  return (
    <View style={styles.body}>
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.kicker}>MENU · LIVE CATALOGUE</Text>
          <Text style={styles.title}>Your dishes</Text>
        </View>
        <View style={styles.titleActions}>
          <Pressable accessibilityRole="button" onPress={() => setArranging('categories')} style={styles.arrange}>
            <Text style={styles.arrangeLabel}>⇅ Categories</Text>
          </Pressable>
          <Pressable onPress={() => setSheet({ mode: 'add' })} style={styles.add}>
            <Text style={styles.addLabel}>+ Dish</Text>
          </Pressable>
        </View>
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
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState message="No dishes match these filters." />}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>
                {section.name} <Text style={styles.sectionCount}>· {section.total}</Text>
              </Text>
              {section.total > 1 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Arrange ${section.name}`}
                  onPress={() => setArranging({ categoryId: section.id, name: section.name })}
                  style={styles.sectionArrange}
                >
                  <Text style={styles.sectionArrangeLabel}>⇅ Arrange</Text>
                </Pressable>
              ) : null}
            </View>
          )}
          renderItem={({ item }) => {
            const types = typeCount(item);
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
                  <Pressable
                    accessibilityRole="switch"
                    accessibilityState={{ checked: !!item.special }}
                    accessibilityLabel={`Special: ${item.name}`}
                    onPress={() => toggleSpecial(item)}
                    hitSlop={8}
                    style={[styles.star, item.special && styles.starOn]}
                  >
                    <Text style={[styles.starLabel, item.special && styles.starLabelOn]}>{item.special ? '★' : '☆'}</Text>
                  </Pressable>
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
      {arranging ? (
        <ArrangeSheet
          title={arranging === 'categories' ? 'Arrange categories' : `Arrange ${arranging.name}`}
          hint={
            arranging === 'categories'
              ? 'Customers see your categories in this order. Categories without dishes stay hidden.'
              : `Customers see the dishes in ${arranging.name} in this order.`
          }
          rows={arrangeRows()}
          onSave={saveOrder}
          onClose={() => setArranging(null)}
        />
      ) : null}
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
  titleActions: {
    flexDirection: 'row',
    gap: 8,
  },
  arrange: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.header,
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  arrangeLabel: {
    color: colors.header,
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  sectionTitle: {
    color: colors.title,
    fontSize: 16,
    fontWeight: '800',
  },
  sectionCount: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  sectionArrange: {
    borderWidth: 1,
    borderColor: '#b9cbdb',
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sectionArrangeLabel: {
    color: colors.header,
    fontSize: 11,
    fontWeight: '700',
  },
  star: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starOn: {
    backgroundColor: '#F79009',
  },
  starLabel: {
    color: '#667085',
    fontSize: 15,
    lineHeight: 17,
  },
  starLabelOn: {
    color: colors.white,
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
