import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, typography } from '../theme';

/** An on/off switch; `ToggleRow` puts a label in front of it. */
export function Toggle({ value }: { value: boolean }) {
  return (
    <View style={[styles.track, value && styles.trackOn]}>
      <View style={styles.thumb} />
    </View>
  );
}

export function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!value)} style={styles.row} accessibilityRole="switch" accessibilityState={{ checked: value }} accessibilityLabel={label}>
      <Text style={typography.bodyStrong}>{label}</Text>
      <Toggle value={value} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.tint,
    borderRadius: radius.md,
    paddingHorizontal: 12,
  },
  track: {
    width: 38,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.line,
    padding: 2,
    justifyContent: 'center',
  },
  trackOn: {
    backgroundColor: colors.primary,
    alignItems: 'flex-end',
  },
  thumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.surface,
  },
});
