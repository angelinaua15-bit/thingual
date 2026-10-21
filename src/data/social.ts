import { PHOTOS, unsplash } from './photos';
import { LangCode } from './languages';

export type ReactionType = 'new' | 'beautiful' | 'same' | 'wanna';
export const REACTIONS: { type: ReactionType; emoji: string }[] = [
  { type: 'new', emoji: '✦' },
  { type: 'beautiful', emoji: '♡' },
  { type: 'same', emoji: '≈' },
  { type: 'wanna', emoji: '↗' },
];

export type Post = {
  id: string;
  concept: string;
  photo: string;
  author: string;
  authorId: string;
  authorLang: LangCode;
  place?: string;
  lat?: number;
  lng?: number;
  createdAt: number;
  isDrop: boolean;
  lateMinutes?: number;
  credit?: string; // photographer on Unsplash
  mine?: boolean;
};

/* ---------- nicknames ---------- */
const ADJ = ['Quiet', 'Amber', 'Lucky', 'Velvet', 'Misty', 'Golden', 'Swift', 'Cosmic', 'Gentle', 'Silver', 'Brave', 'Sunny', 'Little', 'Calm', 'Wild', 'Polar'];
const NOUN = ['Falcon', 'Otter', 'Fox', 'Heron', 'Lynx', 'Panda', 'Moth', 'Raven', 'Koala', 'Wolf', 'Finch', 'Badger', 'Seal', 'Owl', 'Hare', 'Crane'];

export const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export const nicknameFor = (seed: string) => {
  const h = hash(seed);
  return `${ADJ[h % ADJ.length]}${NOUN[(h >> 4) % NOUN.length]}${(h % 900) + 100}`;
};

/** Two-tone gradient avatar derived from a seed. */
export const avatarColors = (seed: string): [string, string] => {
  const h = hash(seed);
  const a = h % 360;
  const b = (a + 40 + ((h >> 8) % 80)) % 360;
  return [`hsl(${a}, 55%, 62%)`, `hsl(${b}, 60%, 42%)`];
};

/* ---------- Daily Drop calendar ---------- */
const DROP_CALENDAR = [
  'window', 'bread', 'door', 'cup', 'tree', 'shoes', 'key', 'coffee', 'bicycle', 'book',
  'flower', 'chair', 'umbrella', 'lamp', 'bench', 'bottle', 'clock', 'apple', 'plant', 'bus',
  'table', 'glasses', 'mirror', 'egg', 'backpack', 'cat', 'plate', 'hat', 'pillow', 'dog',
];
const dayNumber = (d: Date) => Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86400000);
const BASE = dayNumber(new Date(Date.UTC(2026, 9, 21)));

export const dateKey = (d = new Date()) => d.toISOString().slice(0, 10);

export function dropFor(date = new Date()) {
  const idx = (((dayNumber(date) - BASE) % DROP_CALENDAR.length) + DROP_CALENDAR.length) % DROP_CALENDAR.length;
  return DROP_CALENDAR[idx];
}

/** Local release time between 9:00 and 21:00, different every day, same for everyone in a region. */
export function dropReleaseTime(date = new Date()) {
  const key = dateKey(date);
  const minutes = 9 * 60 + (hash(`drop-${key}`) % (12 * 60));
  const d = new Date(date);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
}

export const DROP_WINDOW_MS = 3 * 60 * 1000;

/* ---------- world posts (real photos from Unsplash) ---------- */
const now = Date.now();
export const WORLD_POSTS: Post[] = PHOTOS.filter((p) => p.lat !== undefined).map((p, i) => {
  const authorId = `u-${hash(p.author + p.place) % 100000}`;
  const isDrop = p.concept === dropFor();
  const h = hash(p.id);
  return {
    id: `w-${p.id}`,
    concept: p.concept,
    photo: unsplash(p.path, 900),
    author: nicknameFor(authorId),
    authorId,
    authorLang: (p.lang ?? 'en') as LangCode,
    place: p.place,
    lat: p.lat,
    lng: p.lng,
    createdAt: now - (isDrop ? (h % 300) * 60_000 : ((h % 96) + 2) * 3_600_000),
    isDrop,
    lateMinutes: isDrop && h % 5 === 0 ? (h % 170) + 10 : undefined,
    credit: p.author,
  };
});

/** Demo friends — anonymous nicknames, as in the real app. */
export const FRIENDS = ['u-friend-olena', 'u-friend-marco', 'u-friend-aiko', 'u-friend-lukas', 'u-friend-sofia'].map((id) => ({
  id,
  nickname: nicknameFor(id),
}));

/** A few world posts are attributed to friends so the Friends tab has content. */
export const FRIEND_POST_IDS = new Set(WORLD_POSTS.filter((_, i) => i % 9 === 3).map((p) => p.id));
export const friendPosts = () =>
  WORLD_POSTS.filter((p) => FRIEND_POST_IDS.has(p.id)).map((p, i) => ({
    ...p,
    authorId: FRIENDS[i % FRIENDS.length].id,
    author: FRIENDS[i % FRIENDS.length].nickname,
  }));

/** Weekly community challenges. */
export const CHALLENGES = [
  { id: 'doors', title: { en: 'Doors of the world', uk: 'Двері світу' }, concept: 'door' },
  { id: 'breakfast', title: { en: 'Breakfasts', uk: 'Сніданки' }, concept: 'bread' },
  { id: 'quiet', title: { en: 'Quiet corners', uk: 'Тихі куточки' }, concept: 'bench' },
];

export const THEMED_SETS = [
  { id: 'kitchen', concepts: ['cup', 'plate', 'spoon', 'bread', 'egg', 'teapot', 'coffee', 'bottle', 'apple', 'banana'], free: true },
  { id: 'home', concepts: ['window', 'door', 'chair', 'table', 'bed', 'lamp', 'clock', 'mirror', 'pillow', 'plant'], free: true },
  { id: 'street', concepts: ['bicycle', 'car', 'bus', 'tree', 'flower', 'bench', 'umbrella', 'dog'], free: false },
  { id: 'travel', concepts: ['backpack', 'bottle', 'phone', 'glasses', 'hat', 'umbrella', 'key', 'watch', 'shoes'], free: false },
  { id: 'office', concepts: ['laptop', 'phone', 'book', 'lamp', 'chair', 'table', 'clock', 'cup'], free: false },
];
