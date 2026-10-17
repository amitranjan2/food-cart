import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius } from '../theme';
import { Icon, type IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'quiet';

const TONE: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
  secondary: { bg: colors.surface, fg: colors.primary, border: colors.primary },
  danger: { bg: colors.danger, fg: colors.onPrimary, border: colors.danger },
  quiet: { bg: 'transparent', fg: colors.muted, border: 'transparent' },
};

/**
 * The app's one button. `md` (48 high) for a screen's or sheet's main actions, `sm` (36) inside cards and headings.
 * Labels are sentence case ("Save order", not "SAVE ORDER").
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  busy = false,
  disabled = false,
  grow = false,
  accessibilityLabel,
  style,
  children,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  icon?: IconName;
  busy?: boolean;
  disabled?: boolean;
  /** Share the row's width with its neighbours. */
  grow?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  /** Extra content after the label, e.g. a timer. */
  children?: ReactNode;
}) {
  const tone = TONE[variant];
  const off = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: off, busy }}
      disabled={off}
      onPress={event => {
        event.stopPropagation?.();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        size === 'md' ? styles.md : styles.sm,
        { backgroundColor: tone.bg, borderColor: tone.border },
        grow && styles.grow,
        pressed && !off && styles.pressed,
        disabled && !busy && styles.disabled,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={tone.fg} />
      ) : (
        <View style={styles.content}>
          {icon ? <Icon name={icon} size={size === 'md' ? 18 : 16} color={tone.fg} /> : null}
          <Text style={[size === 'md' ? styles.mdLabel : styles.smLabel, { color: tone.fg }]} numberOfLines={1}>
            {label}
          </Text>
          {children}
        </View>
      )}
    </Pressable>
  );
}

/** A square icon-only button (edit, copy, close, arrows). */
export function IconButton({
  icon,
  label,
  onPress,
  disabled,
  selected,
  size = 36,
  color,
  tone = 'tint',
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  selected?: boolean;
  size?: number;
  color?: string;
  /** Background: `tint` inside cards, `surface` on tinted rows, `none` for bare icons. */
  tone?: 'tint' | 'surface' | 'none';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, selected: !!selected }}
      disabled={disabled}
      hitSlop={6}
      onPress={event => {
        event.stopPropagation?.();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.icon,
        { width: size, height: size, backgroundColor: tone === 'none' ? 'transparent' : tone === 'surface' ? colors.surface : colors.tint },
        selected && styles.iconSelected,
        pressed && styles.pressed,
        disabled && styles.iconDisabled,
      ]}
    >
      <Icon name={icon} size={Math.round(size * 0.5)} color={color ?? colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  md: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: 18,
  },
  sm: {
    minHeight: 36,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
  },
  grow: {
    flex: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mdLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  smLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.45,
  },
  icon: {
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  iconSelected: {
    borderColor: colors.primary,
  },
  iconDisabled: {
    opacity: 0.35,
  },
});
