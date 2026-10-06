import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';
import type { Vendor } from '../types';

export function DrawerMenu({
  vendor,
  onSettings,
  onLogout,
}: {
  vendor: Vendor;
  onSettings: () => void;
  onLogout: () => void;
}) {
  return (
    <View style={styles.drawer}>
      <Text style={styles.name}>{vendor.name}</Text>
      <Text style={styles.status}>Store is {vendor.status === 'OPEN' ? 'Open' : 'Closed'}</Text>
      <Pressable accessibilityRole="button" onPress={onSettings} style={styles.link}>
        <Text style={styles.linkLabel}>⚙ Store settings</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onLogout} style={styles.logout}>
        <Text style={styles.logoutLabel}>↪ Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  drawer: {
    position: 'absolute',
    zIndex: 10,
    top: 62,
    left: 0,
    width: 240,
    backgroundColor: colors.white,
    padding: 16,
    borderBottomRightRadius: 7,
    shadowColor: '#334155',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 4, height: 7 },
    elevation: 8,
    gap: 8,
  },
  name: {
    color: colors.header,
    fontWeight: '700',
    fontSize: 14,
  },
  status: {
    fontSize: 10,
    color: colors.muted,
    marginBottom: 5,
  },
  link: {
    backgroundColor: '#edf4fa',
    borderRadius: 4,
    padding: 10,
  },
  linkLabel: {
    color: colors.header,
    fontSize: 11,
    fontWeight: '700',
  },
  logout: {
    backgroundColor: colors.logoutBg,
    borderRadius: 4,
    padding: 10,
  },
  logoutLabel: {
    color: colors.logoutText,
    fontSize: 11,
    fontWeight: '700',
  },
});
