import { useEffect, useState } from 'react';

/**
 * On the web, personal photos are kept in IndexedDB and referenced as `idb:<id>`.
 * localStorage (where the app state lives) holds ~5 MB — a dozen base64 photos would fill it
 * and silently stop saving progress. blob: URLs also die on reload, so they are copied here too.
 */
const DB = 'thingual-photos';
const STORE = 'photos';
let dbp: Promise<IDBDatabase> | null = null;
const db = () =>
  (dbp ??= new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
const tx = async <T,>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) => {
  const d = await db();
  return new Promise<T>((res, rej) => {
    const req = fn(d.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
};

export const needsPersist = (uri?: string) => !!uri && (uri.startsWith('data:') || uri.startsWith('blob:'));

export async function persistPhoto(uri: string): Promise<string> {
  if (!needsPersist(uri)) return uri;
  try {
    const blob = await (await fetch(uri)).blob();
    const id = `idb:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    await tx('readwrite', (s) => s.put(blob, id));
    cache.set(id, URL.createObjectURL(blob));
    return id;
  } catch {
    return uri.startsWith('blob:') ? '' : uri;
  }
}

const cache = new Map<string, string>();
export async function resolvePhoto(uri: string): Promise<string> {
  if (!uri.startsWith('idb:')) return uri;
  const hit = cache.get(uri);
  if (hit) return hit;
  try {
    const blob = await tx<Blob | undefined>('readonly', (s) => s.get(uri) as IDBRequest<Blob | undefined>);
    if (!blob) return '';
    const url = URL.createObjectURL(blob);
    cache.set(uri, url);
    return url;
  } catch {
    return '';
  }
}

export function useResolvedPhoto(uri?: string) {
  const [out, setOut] = useState(() => (uri?.startsWith('idb:') ? cache.get(uri) : uri));
  useEffect(() => {
    if (!uri?.startsWith('idb:')) return setOut(uri);
    let live = true;
    resolvePhoto(uri).then((u) => live && setOut(u || undefined));
    return () => { live = false; };
  }, [uri]);
  return out;
}
