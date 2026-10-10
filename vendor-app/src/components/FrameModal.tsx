import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { colors } from '../theme';
import { FRAME_MAX_WIDTH } from '../theme/layout';

/**
 * A Modal that stays inside the app's phone-width column (see Screen), so bottom sheets don't stretch across tablets
 * and desktop windows. The dimmed backdrop covers the whole window; tapping it closes the sheet.
 */
export function FrameModal({ onRequestClose, children }: { onRequestClose: () => void; children: ReactNode }) {
  const { width } = useWindowDimensions();
  return (
    <Modal transparent animationType="fade" onRequestClose={onRequestClose}>
      <Pressable style={styles.backdrop} onPress={onRequestClose} accessibilityRole="button" accessibilityLabel="Close" />
      <View pointerEvents="box-none" style={[styles.column, { width: Math.min(width, FRAME_MAX_WIDTH) }]}>
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.scrim,
  },
  column: {
    flex: 1,
    alignSelf: 'center',
  },
});
