import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

export function StoreSwitch({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: open }}
      accessibilityLabel={open ? 'Store is open — tap to close' : 'Store is closed — tap to open'}
      onPress={onToggle}
      style={[styles.track, open ? styles.trackOn : styles.trackOff]}
    >
      <View style={[styles.knob, open && styles.knobOn]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 44,
    height: 26,
    borderRadius: 30,
    padding: 3,
    justifyContent: 'center',
  },
  knob: {
    height: 20,
    width: 20,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  knobOn: {
    alignSelf: 'flex-end',
  },
  trackOn: {
    backgroundColor: colors.success,
  },
  trackOff: {
    backgroundColor: colors.danger,
  },
});
