import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { DrawerMenu } from '../../components/DrawerMenu';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../state/AuthContext';
import { colors, spacing, typography } from '../../theme';

export function HomeScreen() {
  const { vendor, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!vendor) return null;

  return (
    <Screen>
      <StatusBar style="light" />
      <Header title={vendor.name} onMenuPress={() => setMenuOpen(open => !open)} />
      {menuOpen ? (
        <>
          <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)} />
          <DrawerMenu
            vendor={vendor}
            onSettings={() => setMenuOpen(false)}
            onLogout={() => {
              setMenuOpen(false);
              logout();
            }}
          />
        </>
      ) : null}
      <View style={styles.body}>
        <Text style={[typography.sectionLabel, styles.kicker]}>VENDOR · SIGNED IN</Text>
        <Text style={[typography.screenTitle, styles.title]}>Orders next</Text>
        <Text style={styles.copy}>
          You are signed in as {vendor.name}. The order list is the next step and will load from GET
          /api/vendor/orders.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    top: 62,
    zIndex: 9,
  },
  body: {
    padding: spacing.md,
  },
  kicker: {
    color: colors.muted,
  },
  title: {
    color: colors.title,
    marginTop: 4,
  },
  copy: {
    marginTop: 12,
    color: colors.ink,
    fontSize: 12,
    lineHeight: 18,
  },
});
