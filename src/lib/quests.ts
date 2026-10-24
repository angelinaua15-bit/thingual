import { dateKey } from '../data/social';

export type QuestField = 'words' | 'reviews' | 'phrases' | 'photos' | 'drops' | 'grammar' | 'chat' | 'lessons' | 'xp' | 'perfect' | 'lightning' | 'story';
export type Quest = { id: string; field: QuestField; goal: number; reward: number; emoji: string };

/** Pool of daily quests; three are picked per day (same for everyone on that day), the first is always about the path. */
export const PATH_QUESTS: Quest[] = [
  { id: 'lessons2', field: 'lessons', goal: 2, reward: 20, emoji: '🗺️' },
  { id: 'lessons3', field: 'lessons', goal: 3, reward: 30, emoji: '🗺️' },
  { id: 'xp40', field: 'xp', goal: 40, reward: 20, emoji: '⚡' },
  { id: 'xp80', field: 'xp', goal: 80, reward: 35, emoji: '⚡' },
];
export const QUEST_POOL: Quest[] = [
  ...PATH_QUESTS,
  { id: 'perfect1', field: 'perfect', goal: 1, reward: 25, emoji: '🎯' },
  { id: 'lightning1', field: 'lightning', goal: 1, reward: 20, emoji: '⚡' },
  { id: 'story1', field: 'story', goal: 1, reward: 25, emoji: '📖' },
  { id: 'review10', field: 'reviews', goal: 10, reward: 20, emoji: '🧠' },
  { id: 'phrases5', field: 'phrases', goal: 5, reward: 20, emoji: '💬' },
  { id: 'grammar1', field: 'grammar', goal: 1, reward: 25, emoji: '✏️' },
];
export const CHEST_REWARD = 50;
/** crystals in the daily-quest chest */
export const CHEST_CRYSTALS_DAILY = 15;
/** chest icon (picked up by scripts/copy-emoji.js) */
export const QUEST_EMOJI = { chest: '🎁' };

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

/** Three quests for the day, always with different fields. */
export function questsFor(day = dateKey()): Quest[] {
  const order = (xs: Quest[]) => [...xs].sort((a, b) => hash(day + a.id) - hash(day + b.id));
  const out: Quest[] = [order(PATH_QUESTS)[0]];
  for (const q of order(QUEST_POOL)) {
    if (out.length === 3) break;
    if (!out.some((x) => x.field === q.field || (x.field === 'lessons' && q.field === 'xp') || (x.field === 'xp' && q.field === 'lessons'))) out.push(q);
  }
  return out;
}
