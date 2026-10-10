import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import type { Order } from '../types';
import { Button, Chip, Sheet } from '../ui';
import { rupees } from '../utils/format';
import { CANCEL_REASONS } from '../utils/orderStatus';

/** Calls off an accepted order. The customer sees the reason on their order page and gets a full refund. */
export function CancelOrderSheet({ order, onCancel, onClose }: { order: Order; onCancel: (reason: string) => Promise<void>; onClose: () => void }) {
  const [reason, setReason] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!reason) return;
    try {
      setBusy(true);
      setError('');
      await onCancel(reason);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not cancel the order');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      title={`Cancel order #${order.orderNumber}?`}
      hint={`${order.customerName || 'The customer'} is refunded ${rupees(order.total)} in full and sees the reason you pick. This can't be undone.`}
      onClose={onClose}
      footer={
        <>
          <Button label="Keep order" variant="secondary" grow onPress={onClose} />
          <Button label="Cancel order" variant="danger" grow busy={busy} disabled={!reason} onPress={submit} />
        </>
      }
    >
      <Text style={styles.label}>Why are you cancelling?</Text>
      <View style={styles.reasons}>
        {CANCEL_REASONS.map(entry => (
          <Chip key={entry.key} label={entry.label} selected={reason === entry.key} accessibilityRole="radio" onPress={() => setReason(entry.key)} />
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  reasons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
});
