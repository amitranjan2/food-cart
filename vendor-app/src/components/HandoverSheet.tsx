import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors, typography } from '../theme';
import type { Order } from '../types';
import { Button, Field, Sheet } from '../ui';

/**
 * Asks for the code the customer shows. The order completes only if it matches; the vendor never sees the code.
 * The same handshake will be used by delivery partners for last-mile delivery.
 */
export function HandoverSheet({
  order,
  onSubmit,
  onClose,
}: {
  order: Order;
  onSubmit: (code: string) => Promise<void>;
  onClose: () => void;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const customer = [order.customerName, order.customerMobile].filter(Boolean).join(' · ');

  async function submit() {
    try {
      setBusy(true);
      setError('');
      await onSubmit(code);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not check the code');
      setCode('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      title={`Hand over order #${order.orderNumber}`}
      hint="Ask the customer for the 4-digit code on their order page."
      onClose={onClose}
      footer={<Button label="Confirm handover" grow busy={busy} disabled={code.length !== 4} onPress={submit} />}
    >
      {customer ? <Text style={typography.bodyStrong}>{customer}</Text> : null}
      <Field
        value={code}
        onChangeText={value => {
          setCode(value.replace(/\D/g, '').slice(0, 4));
          setError('');
        }}
        keyboardType="number-pad"
        maxLength={4}
        autoFocus
        placeholder="••••"
        invalid={!!error}
        style={styles.code}
        accessibilityLabel="Handover code"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  code: {
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 10,
    paddingVertical: 12,
  },
  error: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
  },
});
