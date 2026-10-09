import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export function DatePager({
  title,
  onPrev,
  onNext,
  nextCount = 0,
}: {
  title: string;
  onPrev: () => void;
  onNext: () => void;
  /** Orders on later days, shown as a badge on the next-day arrow. */
  nextCount?: number;
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
      <Pressable accessibilityRole="button" accessibilityLabel="Previous day" onPress={onPrev} style={styles.arrow}>
        <Text style={styles.arrowLabel}>‹</Text>
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={nextCount > 0 ? `Next day, ${nextCount} upcoming ${nextCount === 1 ? 'order' : 'orders'}` : 'Next day'}
        onPress={onNext}
        style={styles.arrow}
      >
        <Text style={styles.arrowLabel}>›</Text>
        {nextCount > 0 ? (
          <Animated.View style={[styles.badge, { transform: [{ scale }] }]}>
            <Text style={styles.badgeLabel}>{nextCount > 9 ? '9+' : nextCount}</Text>
          </Animated.View>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 6,
    marginBottom: 12,
    shadowColor: '#101828',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 },
  },
  title: {
    color: '#1d2939',
    fontSize: 15,
    fontWeight: '700',
  },
  arrow: {
    width: 36,
    height: 36,
    backgroundColor: '#F2F4F7',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -7,
    right: -7,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: colors.error,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: {
    color: colors.white,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '800',
  },
  arrowLabel: {
    color: '#344054',
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '600',
  },
});
