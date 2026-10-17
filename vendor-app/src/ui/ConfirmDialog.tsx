import { StyleSheet, Text, View } from 'react-native';
import { FrameModal } from '../components/FrameModal';
import { colors, radius, typography } from '../theme';
import { Button } from './Button';

/** Asks before something that can't be undone (remove a dish, reject a paid order). */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  busy,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  return (
    <FrameModal onRequestClose={onCancel}>
      <View style={styles.center} pointerEvents="box-none">
        <View style={styles.card} accessibilityRole="alert">
          <Text style={typography.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Button label="Cancel" variant="secondary" grow onPress={onCancel} />
            <Button label={confirmLabel} variant="danger" grow busy={busy} onPress={onConfirm} />
          </View>
        </View>
      </View>
    </FrameModal>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 18,
    gap: 8,
  },
  message: {
    ...typography.small,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
});
