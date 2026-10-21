import { dateKey } from '../data/social';

/** Days between two YYYY-MM-DD keys (b - a), DST-safe. */
export const dayDiff = (a: string, b: string) => {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
};

export const addDays = (key: string, n: number) => {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d + n, 12));
};

export const MAX_FREEZES = 3;
/** Sparks for the first activity of a day. */
export const DAILY_SPARKS = 10;

export type Reward = { sparks?: number; freezes?: number; flame?: FlameId };
export const MILESTONES: { days: number; reward: Reward }[] = [
  { days: 3, reward: { sparks: 30 } },
  { days: 7, reward: { sparks: 100, freezes: 1 } },
  { days: 14, reward: { sparks: 150 } },
  { days: 30, reward: { sparks: 300, freezes: 1, flame: 'ocean' } },
  { days: 50, reward: { sparks: 500 } },
  { days: 100, reward: { sparks: 1000, freezes: 2, flame: 'violet' } },
  { days: 180, reward: { sparks: 1500 } },
  { days: 365, reward: { sparks: 3650, flame: 'gold' } },
];
export const nextMilestone = (count: number) => MILESTONES.find((m) => m.days > count);
export const prevMilestone = (count: number) => [...MILESTONES].reverse().find((m) => m.days <= count);

export type FlameId = 'classic' | 'ocean' | 'violet' | 'gold';
/** [outer, inner] colours of the flame and the gradient of the share card. */
export const FLAMES: Record<FlameId, { colors: [string, string]; card: [string, string]; price: number }> = {
  classic: { colors: ['#FF6B35', '#FFC94D'], card: ['#FF8A3D', '#E8461E'], price: 0 },
  ocean: { colors: ['#3B82F6', '#7DD3FC'], card: ['#4F8EF7', '#1E3FAE'], price: 800 },
  violet: { colors: ['#8B5CF6', '#F0ABFC'], card: ['#9D6BFF', '#5B21B6'], price: 1500 },
  gold: { colors: ['#D4A017', '#FFF1A8'], card: ['#E9B949', '#9A6B00'], price: 5000 },
};

export const PRICES = { freeze: 200, repair: 450 } as const;
/** A lost streak can be repaired within this many days. */
export const REPAIR_WINDOW = 2;

export type StreakState = { count: number; last?: string };

/** Streak as the user sees it right now (0 if broken and not yet settled by checkStreak). */
export const visibleStreak = (s: StreakState, today = dateKey()) => {
  if (!s.last) return 0;
  const gap = dayDiff(s.last, today);
  return gap <= 1 ? s.count : 0;
};

export const doneToday = (s: StreakState, today = dateKey()) => s.last === today;
