import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export function DatePager({
  title,
  onPrev,
  onNext,
}: {
  title: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <View style={styles.bar}>
      <Pressable accessibilityRole="button" accessibilityLabel="Previous day" onPress={onPrev} style={styles.arrow}>
        <Text style={styles.arrowLabel}>‹</Text>
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Next day" onPress={onNext} style={styles.arrow}>
        <Text style={styles.arrowLabel}>›</Text>
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
  arrowLabel: {
    color: '#344054',
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '600',
  },
});
