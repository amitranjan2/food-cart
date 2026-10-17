import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { typography } from '../theme';

/** The top of every tab and screen: overline ("MENU · LIVE"), big title, actions on the right. */
export function PageHeading({ overline, title, right }: { overline: string; title: string; right?: ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={typography.overline}>{overline}</Text>
        <Text style={[typography.display, styles.title]} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

/** A heading inside a screen ("Opening hours", "Momos · 3"). */
export function SectionHeading({ title, count, right }: { title: string; count?: number; right?: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={typography.heading}>
        {title}
        {count != null ? <Text style={styles.count}> · {count}</Text> : null}
      </Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  copy: {
    flexShrink: 1,
  },
  title: {
    marginTop: 2,
  },
  right: {
    flexDirection: 'row',
    gap: 8,
  },
  section: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 8,
  },
  count: {
    ...typography.caption,
    fontSize: 14,
  },
});
