import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

/** Resize to at most `max` px on the long side and re-encode as JPEG, so uploads stay small. */
export async function shrink(uri: string, max = 1280): Promise<string> {
  try {
    const r = await manipulateAsync(uri, [{ resize: { width: max } }], { compress: 0.72, format: SaveFormat.JPEG });
    return r.uri;
  } catch {
    return uri;
  }
}

export async function pickImage(opts: { square?: boolean; camera?: boolean; max?: number } = {}): Promise<string | null> {
  if (opts.camera && Platform.OS !== 'web') {
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (!p.granted) return null;
  }
  const fn = opts.camera && Platform.OS !== 'web' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
  const r = await fn({ mediaTypes: ['images'], allowsEditing: !!opts.square, aspect: opts.square ? [1, 1] : undefined, quality: 0.8 });
  if (r.canceled || !r.assets?.[0]) return null;
  return shrink(r.assets[0].uri, opts.max ?? 1280);
}

/** JPEG base64 (without the data: prefix) for server recognition — works for file:, blob:, data: and idb-resolved URIs. */
export async function toBase64(uri: string, max = 768): Promise<string | undefined> {
  try {
    const r = await manipulateAsync(uri, [{ resize: { width: max } }], { compress: 0.7, format: SaveFormat.JPEG, base64: true });
    return r.base64 ?? undefined;
  } catch {
    return uri.startsWith('data:') ? uri.split(',')[1] : undefined;
  }
}
