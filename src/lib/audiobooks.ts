import { Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { Book } from '../data/audiobooks';
import { CHAPTERS } from '../data/audiobookChapters';

export type Chapter = { n: number; title: string; url: string; seconds: number };

const parseLength = (v?: string) => {
  if (!v) return 0;
  if (v.includes(':')) return v.split(':').map(Number).reduce((a, x) => a * 60 + x, 0);
  return Math.round(Number(v) || 0);
};

// straight from archive.org; if the browser blocks it, through our own relay (api/archive.js)
async function loadFiles(id: string): Promise<unknown> {
  try {
    const res = await fetch(`https://archive.org/metadata/${id}/files`);
    if (res.ok) return await res.json();
  } catch {}
  const base = Platform.OS === 'web' ? '' : 'https://thingual.vercel.app';
  const res = await fetch(`${base}/api/archive?id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('archive ' + res.status);
  return res.json();
}

/** Chapter list straight from the Internet Archive (LibriVox recordings are public domain). */
export async function fetchChapters(book: Book): Promise<Chapter[]> {
  // bundled chapter lists first: no network round-trip, no CORS surprises
  const known = CHAPTERS[book.id];
  if (known?.length)
    return known.map(([file, title, seconds], i) => ({ n: i, title, seconds, url: `https://archive.org/download/${book.id}/${encodeURIComponent(file)}` }));
  const data = (await loadFiles(book.id)) as { result?: { name: string; format?: string; title?: string; length?: string; track?: string }[] };
  const files = (data.result ?? []).filter((f) => f.name.toLowerCase().endsWith('.mp3'));
  const preferred = files.filter((f) => f.format === book.mp3Format);
  const list = (preferred.length ? preferred : files.filter((f) => /64kb\.mp3$/i.test(f.name)).length ? files.filter((f) => /64kb\.mp3$/i.test(f.name)) : files)
    .sort((a, b) => (Number(a.track) || 0) - (Number(b.track) || 0) || a.name.localeCompare(b.name, undefined, { numeric: true }));
  return list.map((f, i) => ({
    n: i,
    title: (f.title || f.name.replace(/_64kb\.mp3$|\.mp3$/i, '').replace(/_/g, ' ')).trim(),
    url: `https://archive.org/download/${book.id}/${encodeURIComponent(f.name)}`,
    seconds: parseLength(f.length),
  }));
}

export const useChapters = (book?: Book) =>
  useQuery({ queryKey: ['chapters', book?.id], queryFn: () => fetchChapters(book!), enabled: !!book, staleTime: 7 * 864e5, gcTime: 7 * 864e5 });

export const bookCover = (id: string) => `https://archive.org/services/img/${id}`;

export const fmtTime = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

export const fmtMinutes = (n: number, t: (k: string, v?: Record<string, string | number>) => string) =>
  n >= 60 ? t('books.hours', { h: Math.floor(n / 60), m: n % 60 }) : t('books.min', { n });
