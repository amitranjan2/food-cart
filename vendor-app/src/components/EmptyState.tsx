import { StyleSheet, Text, View } from 'react-native';
import { typography } from '../theme';

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 30, paddingHorizontal: 16 },
  text: { ...typography.small, textAlign: 'center', fontSize: 14 },
});
