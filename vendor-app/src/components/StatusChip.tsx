import { StyleSheet, Text, View } from 'react-native';
import type { OrderStatus } from '../types';
import { ORDER_CHIP } from '../utils/orderStatus';

export function StatusChip({ status }: { status: OrderStatus }) {
  const chip = ORDER_CHIP[status];
  return (
    <View style={[styles.chip, { backgroundColor: chip.background }]}>
      <Text style={[styles.label, { color: chip.color }]}>{chip.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
  },
});
