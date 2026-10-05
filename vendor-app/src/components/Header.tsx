import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export function Header({
  title,
  onMenuPress,
  right,
  left,
}: {
  title: string;
  onMenuPress?: () => void;
  right?: ReactNode;
  left?: ReactNode;
}) {
  return (
    <View style={styles.header}>
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
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
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
