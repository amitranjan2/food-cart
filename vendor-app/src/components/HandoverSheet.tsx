import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../theme';
import type { Order } from '../types';

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
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
      <View style={styles.sheet}>
        <Text style={styles.title}>Hand over order #{order.orderNumber}</Text>
        {customer ? <Text style={styles.hint}>{customer}</Text> : null}
        <Text style={styles.hint}>Ask the customer for the 4-digit code on their order page.</Text>
        <TextInput
          value={code}
          onChangeText={value => {
            setCode(value.replace(/\D/g, '').slice(0, 4));
            setError('');
          }}
          keyboardType="number-pad"
          maxLength={4}
          autoFocus
          placeholder="••••"
          placeholderTextColor="#98a8b6"
          style={styles.input}
          accessibilityLabel="Handover code"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable disabled={busy || code.length !== 4} onPress={submit} style={[styles.confirm, busy || code.length !== 4 ? styles.disabled : null]}>
          <Text style={styles.confirmLabel}>{busy ? 'CHECKING…' : 'CONFIRM HANDOVER'}</Text>
        </Pressable>
        <Pressable onPress={onClose} style={styles.cancel}>
          <Text style={styles.cancelLabel}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(30,42,54,0.45)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
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
    fontSize: 14,
    color: colors.muted,
  },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 10,
    color: colors.title,
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
