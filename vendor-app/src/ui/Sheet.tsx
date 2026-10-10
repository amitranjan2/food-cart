import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, type DimensionValue } from 'react-native';
import { FrameModal } from '../components/FrameModal';
import { colors, radius, spacing, typography } from '../theme';
import { IconButton } from './Button';

/**
 * The app's one bottom sheet: white, handle, title row with close (and back for a second step), an optional hint,
 * scrolling content and a fixed footer for the actions. `inline` renders inside the screen's frame instead of a
 * Modal (the dish form, which opens over the menu through Screen's overlay).
 */
export function Sheet({
  title,
  hint,
  onClose,
  onBack,
  footer,
  children,
  inline = false,
  scroll = true,
  maxHeight = '88%',
  onScrollY,
}: {
  title: string;
  hint?: string;
  onClose: () => void;
  onBack?: () => void;
  footer?: ReactNode;
  children: ReactNode;
  inline?: boolean;
  scroll?: boolean;
  maxHeight?: DimensionValue;
  /** How far the content is scrolled, e.g. to swap the title for what's being edited. */
  onScrollY?: (y: number) => void;
}) {
  const body = (
    <KeyboardAvoidingView style={styles.fill} pointerEvents="box-none" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {inline ? <Pressable style={styles.scrim} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" /> : null}
      <View style={[styles.sheet, { maxHeight }]}>
        <View style={styles.handle} />
        <View style={styles.head}>
          {onBack ? <IconButton icon="back" label="Back" onPress={onBack} size={34} /> : null}
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <IconButton icon="close" label="Close" onPress={onClose} size={34} />
        </View>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        {scroll ? (
          <ScrollView
            style={styles.scroller}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={onScrollY ? event => onScrollY(event.nativeEvent.contentOffset.y) : undefined}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={styles.body}>{children}</View>
        )}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </KeyboardAvoidingView>
  );
  if (inline) return <View style={styles.inline}>{body}</View>;
  return <FrameModal onRequestClose={onClose}>{body}</FrameModal>;
}

const styles = StyleSheet.create({
  inline: {
    ...StyleSheet.absoluteFill,
    zIndex: 40,
  },
  fill: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.scrim,
  },
  sheet: {
    width: '100%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: 8,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginBottom: 8,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.gutter,
  },
  title: {
    ...typography.title,
    flex: 1,
  },
  hint: {
    ...typography.small,
    paddingHorizontal: spacing.gutter,
    marginTop: 6,
  },
  scroller: {
    flexGrow: 0,
    flexShrink: 1,
  },
  body: {
    padding: spacing.gutter,
    gap: 10,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: spacing.gutter,
    paddingTop: 10,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
