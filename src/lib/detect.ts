import type { Detection } from './cocoMap';

/**
 * Native builds: live on-device detection needs a development build with a frame processor
 * (react-native-vision-camera + a TFLite model). Until then the native camera captures a photo
 * and the server (or the word picker) names the object.
 */
export const detectorSupported = false;
export async function loadDetector(): Promise<null> {
  return null;
}
export async function detect(_el: unknown, _minScore = 0.5): Promise<Detection[]> {
  return [];
}
export async function detectUri(_uri: string): Promise<Detection[]> {
  return [];
}
