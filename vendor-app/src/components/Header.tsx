import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export function Header({
  title,
  onMenuPress,
  right,
  left,
  notice,
}: {
  title: string;
  onMenuPress?: () => void;
  right?: ReactNode;
  left?: ReactNode;
  /** Shown in place of the title, e.g. a new order; tapping it calls onPress. */
  notice?: { title: string; detail: string; onPress: () => void };
}) {
  return (
    <View style={[styles.header, notice ? styles.alerting : null]}>
      {left ?? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open vendor menu"
          onPress={onMenuPress}
          style={styles.side}
        >
          <Text style={styles.icon}>☰</Text>
        </Pressable>
      )}
      {notice ? (
        <Pressable accessibilityRole="alert" onPress={notice.onPress} style={styles.notice}>
          <Text style={styles.title} numberOfLines={1}>
            {notice.title}
          </Text>
          <Text style={styles.detail} numberOfLines={1}>
            {notice.detail}
          </Text>
        </Pressable>
      ) : (
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      )}
      <View style={styles.side}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 62,
    backgroundColor: colors.header,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 17,
  },
  alerting: {
    backgroundColor: '#1f9d55',
  },
  notice: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  detail: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  side: {
    minWidth: 36,
    alignItems: 'center',
  },
  icon: {
    color: colors.white,
    fontSize: 20,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
