import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { Icon } from '../ui';

export function Header({
  title,
  onMenuPress,
  onBack,
  right,
  notice,
}: {
  title: string;
  onMenuPress?: () => void;
  /** Shows a back arrow instead of the menu button. */
  onBack?: () => void;
  right?: ReactNode;
  /** Shown in place of the title, e.g. a new order; tapping it calls onPress. */
  notice?: { title: string; detail: string; onPress: () => void };
}) {
  return (
    <View style={[styles.header, notice ? styles.alerting : null]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={onBack ? 'Back' : 'Open vendor menu'}
        onPress={onBack ?? onMenuPress}
        hitSlop={8}
        style={styles.side}
      >
        <Icon name={onBack ? 'back' : 'menu'} size={22} color={colors.onPrimary} />
      </Pressable>
      {notice ? (
        <Pressable accessibilityRole="alert" onPress={notice.onPress} style={styles.notice}>
          <View style={styles.noticeRow}>
            <Icon name="bell" size={15} color={colors.onPrimary} />
            <Text style={styles.noticeTitle} numberOfLines={1}>
              {notice.title}
            </Text>
          </View>
          <Text style={styles.detail} numberOfLines={1}>
            {notice.detail}
          </Text>
        </Pressable>
      ) : (
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      )}
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 62,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 8,
  },
  alerting: {
    backgroundColor: colors.success,
  },
  notice: {
    flex: 1,
    alignItems: 'center',
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noticeTitle: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  detail: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  side: {
    minWidth: 44,
    alignItems: 'flex-start',
  },
  right: {
    alignItems: 'flex-end',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: colors.onPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
});
