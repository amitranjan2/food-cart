import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export function BottomNav({
  tab,
  onChange,
}: {
  tab: 'menu' | 'orders';
  onChange: (tab: 'menu' | 'orders') => void;
}) {
  return (
    <View style={styles.bar}>
      <Pressable onPress={() => onChange('menu')} style={[styles.item, tab === 'menu' && styles.selected]}>
        <Text style={[styles.label, tab === 'menu' && styles.selectedLabel]}>▣  Menu</Text>
      </Pressable>
      <Pressable onPress={() => onChange('orders')} style={[styles.item, tab === 'orders' && styles.selected]}>
        <Text style={[styles.label, tab === 'orders' && styles.selectedLabel]}>🛒  Orders</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 12,
    height: 52,
    backgroundColor: colors.header,
    borderRadius: 18,
    padding: 4,
    flexDirection: 'row',
  },
  item: {
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: colors.white,
  },
  label: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  selectedLabel: {
    color: colors.header,
  },
});
