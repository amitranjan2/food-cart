import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { mediaUrl } from '../../api/client';
import { colors } from '../../theme';
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
    <View style={styles.box}>
      <TextInput
        value={query}
        onChangeText={value => {
          setQuery(value);
          setError('');
        }}
        placeholder="Search categories"
        placeholderTextColor="#98a8b6"
        autoFocus
        autoCorrect={false}
        maxLength={30}
        style={styles.search}
        accessibilityLabel="Search categories"
      />
      <ScrollView style={styles.list} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
        {matches.map(category => (
          <Pressable key={category.id} onPress={() => onPick(category)} style={styles.row} accessibilityRole="button">
            {category.imageUrl ? <Image source={{ uri: mediaUrl(category.imageUrl) }} style={styles.image} /> : null}
            <Text style={styles.label}>{category.name}</Text>
          </Pressable>
        ))}
        {matches.length === 0 && !canAdd ? <Text style={styles.empty}>No categories found</Text> : null}
      </ScrollView>
      {canAdd ? (
        <Pressable disabled={busy} onPress={add} style={[styles.add, busy && styles.busy]} accessibilityRole="button">
          <Text style={styles.addLabel}>{busy ? 'Adding…' : `+ Add “${title}” as a new category`}</Text>
          <Text style={styles.addHint}>
            {matches.length > 0 ? 'Check the list above first. ' : ''}New categories are shared with all vendors.
          </Text>
        </Pressable>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.white,
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
  },
  search: {
    margin: 8,
    borderWidth: 1,
    borderColor: '#c9d8e5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#3d5366',
  },
  list: {
    maxHeight: 220,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  image: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  label: {
    fontSize: 14,
    color: '#3d5366',
  },
  empty: {
    padding: 12,
    fontSize: 12,
    color: '#667085',
  },
  add: {
    borderTopWidth: 1,
    borderTopColor: '#e4edf5',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 2,
  },
  busy: {
    opacity: 0.5,
  },
  addLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2F6BFF',
  },
  addHint: {
    fontSize: 11,
    color: '#667085',
  },
  error: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
  },
});
