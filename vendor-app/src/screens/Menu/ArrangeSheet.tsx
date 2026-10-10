import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme';
import { FrameModal } from '../../components/FrameModal';

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
    <FrameModal onRequestClose={onClose}>
      <View style={styles.sheet}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.hint}>{hint}</Text>
        <ScrollView style={styles.list} contentContainerStyle={styles.listBody}>
          {order.map((row, index) => {
            return (
              <View key={row.id} style={[styles.row, row.dimmed && styles.rowEmpty]}>
                <Text style={styles.position}>{index + 1}</Text>
                <View style={styles.copy}>
                  <Text style={styles.name} numberOfLines={1}>{row.name}</Text>
                  <Text style={styles.count}>{row.detail}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Move ${row.name} up`}
                  disabled={index === 0}
                  onPress={() => move(index, -1)}
                  style={[styles.move, index === 0 && styles.moveOff]}
                >
                  <Text style={styles.moveLabel}>↑</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Move ${row.name} down`}
                  disabled={index === order.length - 1}
                  onPress={() => move(index, 1)}
                  style={[styles.move, index === order.length - 1 && styles.moveOff]}
                >
                  <Text style={styles.moveLabel}>↓</Text>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable disabled={busy || !changed} onPress={save} style={[styles.confirm, (busy || !changed) && styles.disabled]}>
          <Text style={styles.confirmLabel}>{busy ? 'SAVING…' : 'SAVE ORDER'}</Text>
        </Pressable>
        <Pressable onPress={onClose} style={styles.cancel}>
          <Text style={styles.cancelLabel}>Cancel</Text>
        </Pressable>
      </View>
    </FrameModal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '85%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.title,
  },
  hint: {
    fontSize: 13,
    color: colors.muted,
  },
  list: {
    flexGrow: 0,
  },
  listBody: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#E7F3FC',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  rowEmpty: {
    opacity: 0.6,
  },
  position: {
    width: 18,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  copy: {
    flex: 1,
  },
  name: {
    color: '#1d2939',
    fontSize: 15,
    fontWeight: '700',
  },
  count: {
    color: '#667085',
    fontSize: 12,
    marginTop: 2,
  },
  move: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveOff: {
    opacity: 0.35,
  },
  moveLabel: {
    color: '#344054',
    fontSize: 18,
    fontWeight: '700',
  },
  error: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
  },
  confirm: {
    marginTop: 4,
    backgroundColor: colors.header,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.45,
  },
  confirmLabel: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
  },
});
