import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, typography } from '../../theme';
import { Button, IconButton, Sheet } from '../../ui';

export type ArrangeRow = { id: string; name: string; detail: string; dimmed?: boolean };

/** Moves rows (categories, or the dishes of one category) up and down; the storefront shows them in this order. */
export function ArrangeSheet({
  title,
  hint,
  rows,
  onSave,
  onClose,
}: {
  title: string;
  hint: string;
  rows: ArrangeRow[];
  onSave: (ids: string[]) => Promise<void>;
  onClose: () => void;
}) {
  const [order, setOrder] = useState(rows);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const changed = order.some((row, index) => row.id !== rows[index]?.id);

  function move(index: number, by: -1 | 1) {
    setOrder(current => {
      const next = [...current];
      const [picked] = next.splice(index, 1);
      next.splice(index + by, 0, picked);
      return next;
    });
  }

  async function save() {
    try {
      setBusy(true);
      setError('');
      await onSave(order.map(row => row.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the order');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      title={title}
      hint={hint}
      onClose={onClose}
      maxHeight="85%"
      footer={<Button label={changed ? 'Save order' : 'No changes yet'} grow busy={busy} disabled={!changed} onPress={save} />}
    >
      {order.map((row, index) => (
        <View key={row.id} style={[styles.row, row.dimmed && styles.dimmed]}>
          <Text style={styles.position}>{index + 1}</Text>
          <View style={styles.copy}>
            <Text style={typography.bodyStrong} numberOfLines={1}>
              {row.name}
            </Text>
            <Text style={typography.caption}>{row.detail}</Text>
          </View>
          <IconButton icon="up" label={`Move ${row.name} up`} tone="surface" disabled={index === 0} onPress={() => move(index, -1)} />
          <IconButton icon="down" label={`Move ${row.name} down`} tone="surface" disabled={index === order.length - 1} onPress={() => move(index, 1)} />
        </View>
      ))}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.tint,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dimmed: {
    opacity: 0.6,
  },
  position: {
    ...typography.caption,
    width: 18,
    fontWeight: '800',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  error: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
  },
});
