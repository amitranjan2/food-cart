import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';
import { Icon, type IconName } from '../ui';

const TABS: { key: 'menu' | 'orders'; label: string; icon: IconName }[] = [
  { key: 'menu', label: 'Menu', icon: 'dishes' },
  { key: 'orders', label: 'Orders', icon: 'orders' },
];

/** setup: the stall is still in onboarding, so the second tab is its checklist instead of orders. */
export function BottomNav({ tab, onChange, setup = false }: { tab: 'menu' | 'orders'; onChange: (tab: 'menu' | 'orders') => void; setup?: boolean }) {
  const tabs = setup ? TABS.map(entry => (entry.key === 'orders' ? { ...entry, label: 'Setup', icon: 'checklist' as IconName } : entry)) : TABS;
  return (
    <View style={styles.bar} accessibilityRole="tablist">
      {tabs.map(entry => {
        const on = tab === entry.key;
        return (
          <Pressable
            key={entry.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(entry.key)}
            style={[styles.item, on && styles.selected]}
          >
            <Icon name={entry.icon} size={18} color={on ? colors.primary : colors.onPrimary} />
            <Text style={[styles.label, on && styles.selectedLabel]}>{entry.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 12,
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: radius.lg + 2,
    padding: 4,
    flexDirection: 'row',
  },
  item: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    borderRadius: radius.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: colors.surface,
  },
  label: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  selectedLabel: {
    color: colors.primary,
  },
});
