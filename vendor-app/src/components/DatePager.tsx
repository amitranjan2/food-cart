import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow, typography } from '../theme';
import { IconButton } from '../ui';

export function DatePager({
  title,
  onPrev,
  onNext,
  nextCount = 0,
  prevCount = 0,
}: {
  title: string;
  onPrev: () => void;
  onNext: () => void;
  /** Orders on later days, shown as a badge on the next-day arrow. */
  nextCount?: number;
  /** Orders still open on earlier days, shown as a badge on the previous-day arrow. */
  prevCount?: number;
}) {
  // A quick pop when an order for a later day arrives; not when the count changes because the day was changed.
  const scale = useRef(new Animated.Value(1)).current;
  const previous = useRef({ title, nextCount });
  useEffect(() => {
    const before = previous.current;
    previous.current = { title, nextCount };
    if (before.title !== title || nextCount <= before.nextCount) return;
    const useNativeDriver = Platform.OS !== 'web';
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.45, duration: 140, useNativeDriver }),
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 160, useNativeDriver }),
    ]).start();
  }, [title, nextCount, scale]);

  return (
    <View style={styles.bar}>
      <View>
        <IconButton
          icon="chevronLeft"
          label={prevCount > 0 ? `Previous day, ${prevCount} open ${prevCount === 1 ? 'order' : 'orders'} on earlier days` : 'Previous day'}
          onPress={onPrev}
        />
        {prevCount > 0 ? (
          <View pointerEvents="none" style={[styles.badge, styles.badgeLeft]}>
            <Text style={styles.badgeLabel}>{prevCount > 9 ? '9+' : prevCount}</Text>
          </View>
        ) : null}
      </View>
      <Text style={typography.bodyStrong}>{title}</Text>
      <View>
        <IconButton
          icon="chevronRight"
          label={nextCount > 0 ? `Next day, ${nextCount} upcoming ${nextCount === 1 ? 'order' : 'orders'}` : 'Next day'}
          onPress={onNext}
        />
        {nextCount > 0 ? (
          <Animated.View pointerEvents="none" style={[styles.badge, { transform: [{ scale }] }]}>
            <Text style={styles.badgeLabel}>{nextCount > 9 ? '9+' : nextCount}</Text>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 6,
    marginBottom: 12,
    ...shadow,
  },
  badge: {
    position: 'absolute',
    top: -7,
    right: -7,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Orders left open on earlier days are overdue, so the badge is amber; later days (danger red) are just upcoming.
  badgeLeft: {
    right: 'auto',
    left: -7,
    backgroundColor: colors.warning,
  },
  badgeLabel: {
    color: colors.onPrimary,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '800',
  },
});
