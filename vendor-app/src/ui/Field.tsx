import { forwardRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { colors, radius } from '../theme';
import { Icon } from './Icon';

type Props = TextInputProps & {
  invalid?: boolean;
  /** Fields sit on tint inside a card or sheet; on the bare page (login, search) use `surface`. */
  tone?: 'tint' | 'surface';
  compact?: boolean;
};

/** The app's one text field: tint fill, primary outline while typing, red outline when invalid. */
export const Field = forwardRef<TextInput, Props>(function Field({ invalid, tone = 'tint', compact, style, onFocus, onBlur, ...props }, ref) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.faint}
      selectionColor={colors.primary}
      underlineColorAndroid="transparent"
      {...props}
      onFocus={event => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={event => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={[
        styles.field,
        compact && styles.compact,
        { backgroundColor: tone === 'surface' ? colors.surface : colors.tint },
        focused && styles.focused,
        invalid && styles.invalid,
        style,
      ]}
    />
  );
});

/** Looks like a field, opens a choice (category, food type, status filter). */
export function FieldButton({
  value,
  placeholder,
  onPress,
  invalid,
  active,
  tone = 'tint',
  compact,
  style,
  accessibilityLabel,
}: {
  value?: string;
  placeholder: string;
  onPress: () => void;
  invalid?: boolean;
  active?: boolean;
  tone?: 'tint' | 'surface';
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? placeholder}
      accessibilityState={{ expanded: !!active }}
      onPress={onPress}
      style={[
        styles.field,
        styles.button,
        compact && styles.compact,
        { backgroundColor: tone === 'surface' ? colors.surface : colors.tint },
        active && styles.focused,
        invalid && styles.invalid,
        style,
      ]}
    >
      <Text style={[styles.text, compact && styles.compactText, !value && styles.placeholder]} numberOfLines={1}>
        {value || placeholder}
      </Text>
      <View style={active ? styles.flip : undefined}>
        <Icon name="chevronDown" size={16} color={colors.muted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    ...Platform.select({ web: { outlineStyle: 'none', outlineWidth: 0 } as object, default: {} }),
  },
  compact: {
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 11,
    fontSize: 14,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  text: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  compactText: {
    fontSize: 14,
  },
  placeholder: {
    color: colors.faint,
  },
  focused: {
    borderColor: colors.primary,
  },
  invalid: {
    borderColor: colors.danger,
  },
  flip: {
    transform: [{ rotate: '180deg' }],
  },
});
