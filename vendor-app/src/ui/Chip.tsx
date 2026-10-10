import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';

export type Tone = 'neutral' | 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'orange' | 'purple';

const TONES: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: colors.tint, fg: colors.text },
  primary: { bg: colors.primary, fg: colors.onPrimary },
  success: { bg: colors.successBg, fg: colors.success },
  danger: { bg: colors.dangerBg, fg: colors.danger },
  warning: { bg: colors.warningBg, fg: colors.warning },
  info: { bg: colors.infoBg, fg: colors.info },
  orange: { bg: colors.orangeBg, fg: colors.orange },
  purple: { bg: colors.purpleBg, fg: colors.purple },
};

/** A status label (order status, Open/Closed, Pickup). Pill shaped, sentence case. */
export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const t = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.badgeLabel, { color: t.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** A choice in a row of filters or options: tint when off, primary when on. */
export function Chip({
  label,
  selected,
  onPress,
  accessibilityRole = 'button',
  tone = 'tint',
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  accessibilityRole?: 'button' | 'checkbox' | 'radio';
  /** Unselected fill: `tint` inside cards and sheets, `surface` on the page or on a tinted row. */
  tone?: 'tint' | 'surface';
}) {
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityRole === 'button' ? { selected: !!selected } : { checked: !!selected }}
      onPress={onPress}
      style={[styles.chip, { backgroundColor: selected ? colors.primary : tone === 'surface' ? colors.surface : colors.tint }]}
    >
      <Text style={[styles.chipLabel, { color: selected ? colors.onPrimary : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  chip: {
    height: 34,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    // No browser focus box in the web build; the fill already shows the chosen chip.
    outlineWidth: 0,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
});
