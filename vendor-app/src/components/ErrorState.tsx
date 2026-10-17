import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export function ErrorState({ message }: { message: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 30, paddingHorizontal: 16 },
  text: { textAlign: 'center', fontSize: 14, color: colors.danger, fontWeight: '600' },
});
