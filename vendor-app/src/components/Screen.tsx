import { createContext, ReactNode, useContext, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, useWindowDimensions, View, ViewStyle } from 'react-native';
import { colors } from '../theme';
import { FRAME_MAX_WIDTH } from '../theme/layout';

const FrameOverlayContext = createContext<(node: ReactNode | null) => void>(() => {});

export function useFrameOverlay() {
  return useContext(FrameOverlayContext);
}

export function Screen({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { width } = useWindowDimensions();
  const frameWidth = Math.min(width, FRAME_MAX_WIDTH);
  const [overlay, setOverlay] = useState<ReactNode>(null);

  return (
    <View style={styles.shell}>
      <FrameOverlayContext.Provider value={setOverlay}>
        <SafeAreaView
          style={[styles.screen, { width: frameWidth }, width > FRAME_MAX_WIDTH && styles.framed, style]}
          edges={['top', 'left', 'right']}
        >
          {children}
          {overlay}
        </SafeAreaView>
      </FrameOverlayContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.page,
    alignItems: 'center',
  },
  screen: {
    flex: 1,
    maxWidth: '100%',
    backgroundColor: colors.page,
    overflow: 'hidden',
  },
  framed: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.line,
  },
});
