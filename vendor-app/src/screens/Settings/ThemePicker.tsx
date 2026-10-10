import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../../theme';
import type { StoreTheme } from '../../types';

/** The fixed colour pairs; each tile shows the light header with the dark text and button, as on the storefront. */
export function ThemePicker({ themes, value, onChange }: { themes: StoreTheme[]; value: string; onChange: (key: string) => void }) {
  return (
    <View style={styles.grid}>
      {themes.map(theme => {
        const on = theme.key === value;
        return (
          <Pressable
            key={theme.key}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={`${theme.name} colours`}
            onPress={() => onChange(theme.key)}
            style={[styles.tile, on && { borderColor: theme.dark }]}
          >
            <View style={[styles.swatch, { backgroundColor: theme.light }]}>
              <Text style={[styles.sample, { color: theme.dark }]}>Aa</Text>
              <View style={[styles.pill, { backgroundColor: theme.dark }]} />
            </View>
            <Text style={[styles.name, on && styles.nameOn]}>{on ? '✓ ' : ''}{theme.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    width: '23%',
    flexGrow: 1,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: radius.md,
    padding: 4,
    alignItems: 'center',
    gap: 4,
  },
  swatch: {
    width: '100%',
    height: 52,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  sample: {
    fontSize: 16,
    fontWeight: '800',
  },
  pill: {
    width: 26,
    height: 7,
    borderRadius: 4,
  },
  name: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  nameOn: {
    color: colors.text,
  },
});
