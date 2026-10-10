import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { mediaUrl } from '../../api/client';
import { colors, radius, typography } from '../../theme';
import { Field, Panel } from '../../ui';
import type { MenuCategory } from '../../types';
import { categoryTitle, searchCategories } from '../../utils/categorySearch';

/**
 * Search the shared category list; if nothing fits, add the typed name as a new category that every vendor
 * can then find.
 */
export function CategoryPicker({
  categories,
  onPick,
  onAdd,
}: {
  categories: MenuCategory[];
  onPick: (category: MenuCategory) => void;
  onAdd: (name: string) => Promise<MenuCategory>;
}) {
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { matches, exact } = searchCategories(categories, query);
  const title = categoryTitle(query);
  const canAdd = !exact && title.length >= 2;

  async function add() {
    try {
      setBusy(true);
      setError('');
      onPick(await onAdd(title));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add the category');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel style={styles.box}>
      <Field
        value={query}
        onChangeText={value => {
          setQuery(value);
          setError('');
        }}
        placeholder="Search categories"
        autoFocus
        autoCorrect={false}
        maxLength={30}
        compact
        accessibilityLabel="Search categories"
      />
      <ScrollView style={styles.list} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
        {matches.map(category => (
          <Pressable key={category.id} onPress={() => onPick(category)} style={styles.row} accessibilityRole="button">
            {category.imageUrl ? <Image source={{ uri: mediaUrl(category.imageUrl) }} style={styles.image} /> : null}
            <Text style={typography.body}>{category.name}</Text>
          </Pressable>
        ))}
        {matches.length === 0 && !canAdd ? <Text style={styles.empty}>No categories found</Text> : null}
      </ScrollView>
      {canAdd ? (
        <Pressable disabled={busy} onPress={add} style={[styles.add, busy && styles.busy]} accessibilityRole="button">
          <Text style={styles.addLabel}>{busy ? 'Adding…' : `+ Add “${title}” as a new category`}</Text>
          <Text style={typography.caption}>
            {matches.length > 0 ? 'Check the list above first. ' : ''}New categories are shared with all vendors.
          </Text>
        </Pressable>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Panel>
  );
}

const styles = StyleSheet.create({
  box: {
    padding: 8,
    gap: 4,
  },
  list: {
    maxHeight: 220,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 6,
    paddingVertical: 11,
  },
  image: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
  },
  empty: {
    ...typography.small,
    padding: 8,
  },
  add: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingHorizontal: 6,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 2,
  },
  busy: {
    opacity: 0.5,
  },
  addLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.link,
  },
  error: {
    paddingHorizontal: 6,
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
  },
});
