import { Image, StyleSheet, View } from 'react-native';

const icons = {
  edit: require('../../../assets/menu/edit.png'),
  copy: require('../../../assets/menu/copy.png'),
  pause: require('../../../assets/menu/pause.png'),
  delete: require('../../../assets/menu/delete.png'),
  add: require('../../../assets/menu/add.png'),
} as const;

type IconProps = {
  size?: number;
};

function MenuIcon({ source, size = 18 }: { source: number; size?: number }) {
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <Image source={source} style={styles.image} resizeMode="contain" accessibilityIgnoresInvertColors />
    </View>
  );
}

export function AddIcon({ size = 18 }: IconProps) {
  return <MenuIcon source={icons.add} size={size} />;
}

export function EditDishIcon({ size = 18 }: IconProps) {
  return <MenuIcon source={icons.edit} size={size} />;
}

export function CopyDishIcon({ size = 18 }: IconProps) {
  return <MenuIcon source={icons.copy} size={size} />;
}

export function PauseDishIcon({ size = 18, color }: IconProps & { color?: string }) {
  const paused = !!color;
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <Image
        source={icons.pause}
        style={[styles.image, paused ? { tintColor: color } : null]}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

export function DeleteDishIcon({ size = 18 }: IconProps) {
  return <MenuIcon source={icons.delete} size={size} />;
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
