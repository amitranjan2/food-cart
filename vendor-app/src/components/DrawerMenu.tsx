import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow, typography } from '../theme';
import type { Vendor } from '../types';
import { Badge, Icon, type IconName } from '../ui';

export function DrawerMenu({
  vendor,
  onSettings,
  onShare,
  onLogout,
}: {
  vendor: Vendor;
  onSettings: () => void;
  onShare?: () => void;
  onLogout: () => void;
}) {
  return (
    <View style={styles.drawer}>
      <Text style={typography.heading} numberOfLines={2}>
        {vendor.name}
      </Text>
      <Badge label={vendor.status === 'OPEN' ? 'Store open' : 'Store closed'} tone={vendor.status === 'OPEN' ? 'success' : 'danger'} />
      <View style={styles.links}>
        <Row icon="settings" label="Store settings" onPress={onSettings} />
        {onShare ? <Row icon="qr" label="Share your store" onPress={onShare} /> : null}
        <Row icon="logout" label="Log out" onPress={onLogout} danger />
      </View>
    </View>
  );
}

function Row({ icon, label, onPress, danger }: { icon: IconName; label: string; onPress: () => void; danger?: boolean }) {
  const color = danger ? colors.danger : colors.primary;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.row, danger && styles.danger]}>
      <Icon name={icon} size={18} color={color} />
      <Text style={[styles.rowLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  drawer: {
    position: 'absolute',
    zIndex: 10,
    top: 62,
    left: 0,
    width: 260,
    backgroundColor: colors.surface,
    padding: 16,
    borderBottomRightRadius: radius.lg,
    gap: 8,
    ...shadow,
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  links: {
    marginTop: 8,
    gap: 8,
  },
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.tint,
    borderRadius: radius.md,
    paddingHorizontal: 12,
  },
  danger: {
    backgroundColor: colors.dangerBg,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});
