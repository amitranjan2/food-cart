import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { deleteMenuItem, getVendorMenu, patchItemAvailability, patchItemSpecial, putCategoryOrder, putItemOrder } from '../../api/menu';
import { isAuthFailure, mediaUrl } from '../../api/client';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { useFrameOverlay } from '../../components/Screen';
import { useAuth } from '../../state/AuthContext';
import { colors, radius, spacing, typography } from '../../theme';
import { Button, Card, Chip, ConfirmDialog, Field, FieldButton, Icon, PageHeading, SectionHeading } from '../../ui';
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

type FoodFilter = FoodType | 'ALL' | 'SPECIAL';

const FOOD_FILTERS: { value: FoodFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'SPECIAL', label: '★ Special' },
  { value: 'VEGAN', label: 'Vegan' },
  { value: 'VEG', label: 'Veg' },
  { value: 'NON_VEG', label: 'Non-veg' },
  { value: 'EGG', label: 'Egg' },
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
  const [food, setFood] = useState<FoodFilter>('ALL');
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
        onCategoryAdded={category =>
          setCategories(current => (current.some(entry => entry.id === category.id) ? current : [...current, category]))
        }
      />,
    );
  }, [sheet, categories, load, setOverlay]);

  useEffect(() => () => setOverlay(null), [setOverlay]);

  const shown = items.filter(item => {
    if (food === 'SPECIAL' ? !item.special : food !== 'ALL' && item.foodType !== food) return false;
    if (availability === 'LIVE' && !item.available) return false;
    if (availability === 'SOLD_OUT' && item.available) return false;
    return item.name.toLowerCase().includes(query.trim().toLowerCase());
  });

  // Arranging is only offered on the full, unfiltered menu, so the vendor always sees every dish they are moving.
  const unfiltered = food === 'ALL' && availability === 'ALL' && query.trim() === '';

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
      // Only take the changed flag: the menu response maps older dishes to their catalogue category, this one doesn't.
      setItems(current => current.map(entry => (entry.id === saved.id ? { ...entry, available: saved.available } : entry)));
    } catch (e) {
      if (isAuthFailure(e)) await logout();
      else setError(e instanceof Error ? e.message : 'Could not update availability');
    }
  }

  async function toggleSpecial(item: MenuItem) {
    if (!token) return;
    try {
      const saved = await patchItemSpecial(token, item.id, !item.special);
      setItems(current => current.map(entry => (entry.id === saved.id ? { ...entry, special: saved.special } : entry)));
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
      // The shared list holds every vendor's categories; only the ones this vendor uses are worth arranging.
      return categories
        .map(category => ({ category, count: items.filter(item => item.categoryId === category.id).length }))
        .filter(entry => entry.count > 0)
        .map(({ category, count }) => ({ id: category.id, name: category.name, detail: `${count} ${count === 1 ? 'dish' : 'dishes'}` }));
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
      <PageHeading
        overline="MENU · LIVE CATALOGUE"
        title="Your dishes"
        right={
          <>
            {unfiltered ? <Button label="Categories" icon="sort" variant="secondary" size="sm" onPress={() => setArranging('categories')} accessibilityLabel="Arrange categories" /> : null}
            <Button label="Dish" icon="plus" size="sm" onPress={() => setSheet({ mode: 'add' })} accessibilityLabel="Add dish" />
          </>
        }
      />
      <View style={styles.tools}>
        <Field value={query} onChangeText={setQuery} placeholder="Search dishes" tone="surface" compact style={styles.search} accessibilityLabel="Search dishes" />
        <FieldButton
          value={STATUS_FILTERS.find(option => option.value === availability)?.label}
          placeholder="All status"
          tone="surface"
          compact
          active={statusOpen}
          onPress={() => setStatusOpen(open => !open)}
          style={styles.status}
          accessibilityLabel="Filter by status"
        />
      </View>
      {statusOpen ? (
        <View style={styles.statusList}>
          {STATUS_FILTERS.map(option => (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: availability === option.value }}
              onPress={() => {
                setAvailability(option.value);
                setStatusOpen(false);
              }}
              style={styles.statusOption}
            >
              <Text style={typography.body}>{option.label}</Text>
              {availability === option.value ? <Icon name="check" size={16} /> : null}
            </Pressable>
          ))}
        </View>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filters}>
        {FOOD_FILTERS.map(option => (
          <Chip key={option.value} label={option.label} tone="surface" selected={food === option.value} onPress={() => setFood(option.value)} />
        ))}
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
          ListEmptyComponent={
            <EmptyState
              message={
                food === 'SPECIAL' && !items.some(item => item.special)
                  ? 'No specials yet. Tap ☆ on a dish photo to show it in your storefront’s specials.'
                  : 'No dishes match these filters.'
              }
            />
          }
          renderSectionHeader={({ section }) => (
            <SectionHeading
              title={section.name}
              count={unfiltered ? section.total : section.data.length}
              right={
                unfiltered && section.total > 1 ? (
                  <Button
                    label="Arrange"
                    icon="sort"
                    variant="secondary"
                    size="sm"
                    accessibilityLabel={`Arrange ${section.name}`}
                    onPress={() => setArranging({ categoryId: section.id, name: section.name })}
                  />
                ) : null
              }
            />
          )}
          renderItem={({ item }) => {
            const types = typeCount(item);
            return (
              <Card style={[styles.card, !item.available && styles.cardOff]}>
                <View style={styles.photoWrap}>
                  {mediaUrl(item.imageUrl) ? <Image source={{ uri: mediaUrl(item.imageUrl) }} style={styles.photo} /> : <View style={styles.photo} />}
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
                    <Icon name="star" size={15} color={item.special ? colors.onPrimary : colors.muted} filled={!!item.special} />
                  </Pressable>
                </View>
                <View style={styles.copy}>
                  <View style={styles.nameRow}>
                    <FoodMark foodType={item.foodType} />
                    <Text style={[typography.heading, styles.name]} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                  <Text style={styles.description} numberOfLines={2}>
                    {item.description || 'Freshly prepared at the counter'}
                  </Text>
                  <View style={styles.footer}>
                    <Text style={typography.caption}>
                      {types} {types === 1 ? 'type' : 'types'}
                      {item.available ? '' : ' · Paused'}
                    </Text>
                    <View style={styles.iconRow}>
                      <Pressable accessibilityRole="button" accessibilityLabel="Edit dish" onPress={() => setSheet({ mode: 'edit', item })} hitSlop={6} style={styles.iconButton}>
                        <EditDishIcon />
                      </Pressable>
                      <Pressable accessibilityRole="button" accessibilityLabel="Duplicate dish" onPress={() => setSheet({ mode: 'add', item })} hitSlop={6} style={styles.iconButton}>
                        <CopyDishIcon />
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={item.available ? `Pause ${item.name}` : `Resume ${item.name}`}
                        onPress={() => pause(item)}
                        hitSlop={6}
                        style={styles.iconButton}
                      >
                        <PauseDishIcon color={item.available ? undefined : colors.danger} />
                      </Pressable>
                      <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${item.name}`} onPress={() => remove(item)} hitSlop={6} style={styles.iconButton}>
                        <DeleteDishIcon />
                      </Pressable>
                    </View>
                  </View>
                </View>
              </Card>
            );
          }}
        />
      )}
      {arranging ? (
        <ArrangeSheet
          title={arranging === 'categories' ? 'Arrange categories' : `Arrange ${arranging.name}`}
          hint={
            arranging === 'categories'
              ? 'Customers see your categories in this order.'
              : `Customers see the dishes in ${arranging.name} in this order.`
          }
          rows={arrangeRows()}
          onSave={saveOrder}
          onClose={() => setArranging(null)}
        />
      ) : null}
      {pendingDelete ? (
        <ConfirmDialog
          title="Remove dish?"
          message={`Remove ${pendingDelete.name} from your menu? Customers stop seeing it straight away.`}
          confirmLabel="Remove"
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      ) : null}
    </View>
  );
}

function FoodMark({ foodType }: { foodType?: string }) {
  const color = foodType === 'NON_VEG' ? colors.nonVeg : foodType === 'EGG' ? colors.egg : foodType === 'OTHER' ? colors.muted : colors.veg;
  return (
    <View style={[styles.mark, { borderColor: color }]}>
      <View style={[styles.markDot, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    padding: spacing.gutter,
    paddingBottom: 84,
  },
  tools: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  search: {
    flex: 1,
  },
  status: {
    width: 128,
  },
  statusList: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: 8,
    overflow: 'hidden',
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  filterScroll: {
    height: 38,
    flexGrow: 0,
    // Otherwise a long dish list squeezes the row and clips the chips.
    flexShrink: 0,
  },
  filters: {
    gap: 8,
    alignItems: 'center',
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
    marginVertical: 8,
  },
  list: {
    gap: 10,
    paddingBottom: 24,
  },
  card: {
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
    borderRadius: radius.md,
    backgroundColor: colors.tint,
  },
  priceBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  price: {
    color: colors.onPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  star: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starOn: {
    backgroundColor: colors.special,
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
  },
  description: {
    ...typography.small,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconButton: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
