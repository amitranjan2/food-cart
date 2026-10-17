import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** Wide enough for the storefront's biggest dish card on a sharp phone screen; a few hundred KB as JPEG. */
export const DISH_PHOTO_WIDTH = 1200;
const JPEG_QUALITY = 0.75;

export type DishPhoto = { uri: string; width: number; height: number };

/**
 * A dish photo from the camera or the gallery, cropped to the storefront's 4:3 card and shrunk to a small JPEG, so it
 * uploads quickly on mobile data and always fits the API's 5 MB limit. null when the vendor backed out; 'denied' when
 * the camera isn't allowed.
 */
export async function pickDishPhoto(source: 'camera' | 'library'): Promise<DishPhoto | 'denied' | null> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 1 };
  let result: ImagePicker.ImagePickerResult;
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return 'denied';
    result = await ImagePicker.launchCameraAsync(options);
  } else {
    // The system photo picker needs no storage permission.
    result = await ImagePicker.launchImageLibraryAsync(options);
  }
  const asset = result.canceled ? null : result.assets?.[0];
  if (!asset) return null;
  const context = ImageManipulator.manipulate(asset.uri);
  if (asset.width > DISH_PHOTO_WIDTH) context.resize({ width: DISH_PHOTO_WIDTH });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
  return { uri: saved.uri, width: saved.width, height: saved.height };
}
