/**
 * Native: camera/gallery URIs are already files on the device, nothing to do.
 * Web: see photoStore.web.ts (photos live in IndexedDB, not in localStorage).
 */
export const needsPersist = (_uri?: string) => false;
export const persistPhoto = async (uri: string) => uri;
export const resolvePhoto = async (uri: string) => uri;
export const useResolvedPhoto = (uri?: string) => uri;
