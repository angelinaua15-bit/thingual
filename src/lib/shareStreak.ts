import { Share } from 'react-native';
import * as Sharing from 'expo-sharing';
import type { FlameId } from './streak';

export type ShareInput = { count: number; flame: FlameId; text: string; caption: string; words: number; wordsLabel: string; capture?: () => Promise<string | undefined> };

/** Native: share the rendered card image (ViewShot); fall back to text. */
export async function shareStreak(input: ShareInput): Promise<'shared' | 'copied' | 'failed'> {
  try {
    const uri = await input.capture?.();
    if (uri && (await Sharing.isAvailableAsync())) {
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: input.text });
      return 'shared';
    }
  } catch {}
  try {
    await Share.share({ message: `${input.text}\nhttps://thingual.vercel.app` });
    return 'shared';
  } catch {
    return 'failed';
  }
}
