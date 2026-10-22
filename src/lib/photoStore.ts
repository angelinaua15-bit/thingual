import { File, Directory, Paths } from 'expo-file-system';

/**
 * Native: photos from the camera / picker live in the cache folder, which the system may clear.
 * Saved word photos are copied into the app's documents folder so they survive.
 */
const dir = () => {
  const d = new Directory(Paths.document, 'photos');
  if (!d.exists) d.create({ intermediates: true });
  return d;
};
const docPrefix = () => Paths.document.uri;

export const needsPersist = (uri?: string) => !!uri && (uri.startsWith('data:') || (uri.startsWith('file:') && !uri.startsWith(docPrefix())));

export async function persistPhoto(uri: string): Promise<string> {
  if (!needsPersist(uri)) return uri;
  try {
    const name = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.jpg`;
    const target = new File(dir(), name);
    if (uri.startsWith('data:')) {
      target.create();
      await target.write(uri.split(',')[1] ?? '', { encoding: 'base64' });
    } else {
      await new File(uri).copy(target);
    }
    return target.uri;
  } catch {
    return uri;
  }
}

export const resolvePhoto = async (uri: string) => uri;
export const useResolvedPhoto = (uri?: string) => uri;
