import { dateKey } from '../data/social';

export type QuestField = 'words' | 'reviews' | 'phrases' | 'photos' | 'drops' | 'grammar' | 'chat';
export type Quest = { id: string; field: QuestField; goal: number; reward: number; emoji: string };

/** Pool of daily quests; three are picked per day (same for everyone on that day). */
export const QUEST_POOL: Quest[] = [
  { id: 'words3', field: 'words', goal: 3, reward: 20, emoji: '📚' },
  { id: 'words5', field: 'words', goal: 5, reward: 30, emoji: '📚' },
  { id: 'review10', field: 'reviews', goal: 10, reward: 20, emoji: '🧠' },
  { id: 'review20', field: 'reviews', goal: 20, reward: 35, emoji: '🧠' },
  { id: 'phrases5', field: 'phrases', goal: 5, reward: 20, emoji: '💬' },
  { id: 'photo1', field: 'photos', goal: 1, reward: 15, emoji: '📸' },
  { id: 'photo3', field: 'photos', goal: 3, reward: 30, emoji: '📸' },
  { id: 'drop1', field: 'drops', goal: 1, reward: 25, emoji: '🎯' },
  { id: 'grammar1', field: 'grammar', goal: 1, reward: 25, emoji: '✏️' },
  { id: 'chat3', field: 'chat', goal: 3, reward: 25, emoji: '🤖' },
];
export const CHEST_REWARD = 50;
/** chest icon (picked up by scripts/copy-emoji.js) */
export const QUEST_EMOJI = { chest: '🎁' };

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

/** Three quests for the day, always with different fields. */
export function questsFor(day = dateKey()): Quest[] {
  const out: Quest[] = [];
  const order = [...QUEST_POOL].sort((a, b) => hash(day + a.id) - hash(day + b.id));
  for (const q of order) {
    if (out.length === 3) break;
    if (!out.some((x) => x.field === q.field)) out.push(q);
  }
  return out;
}
