import React from 'react';
import { router } from 'expo-router';
import { useApp } from '../store/useApp';
import { dateKey } from '../data/social';
import type { Topic } from '../data/concepts';
import { bookById, booksFor } from '../data/audiobooks';
import { LIMITS } from './limits';
export { LIMITS };

/**
 * Free vs Thingual Max. Free stays genuinely useful (camera, dictionary, reviews, Daily Drop, community);
 * Max removes limits on AI and opens the full course.
 */

export const FREE_SITUATIONS = ['basics', 'cafe', 'directions'];
export const FREE_TOPICS: Topic[] = ['people', 'food', 'fruits', 'kitchen', 'home', 'clothes', 'colors', 'time', 'actions', 'qualities', 'animals', 'nature', 'city'];
export const FREE_GRAMMAR_LEVELS = ['A1'];

export const isMaxState = (s: { maxUntil?: number }) => !!s.maxUntil && s.maxUntil > Date.now();
export const useIsMax = () => {
  const max = useApp((s) => isMaxState(s));
  const until = useApp((s) => s.maxUntil);
  // re-render when a trial runs out while the app is open
  const [, tick] = React.useState(0);
  React.useEffect(() => {
    if (!max || !until) return;
    const ms = until - Date.now();
    if (ms > 2 ** 31 - 1) return;
    const id = setTimeout(() => tick((n) => n + 1), ms + 50);
    return () => clearTimeout(id);
  }, [max, until]);
  return max;
};
export const isMax = () => isMaxState(useApp.getState());

export type MaxReason = 'ai' | 'chat' | 'word' | 'books' | 'phrases' | 'english' | 'grammar' | 'topics' | 'bulk' | 'languages' | 'satellite' | 'flame' | 'hearts';

/** Opens the Max page explaining what is locked. Returns true when the feature can be used. */
export function requireMax(reason: MaxReason) {
  if (isMax()) return true;
  router.push({ pathname: '/premium', params: { reason } });
  return false;
}

type Kind = 'ai' | 'chat' | 'word';
/** Today's counters; tolerant of older saved shapes of `usage`. */
function today() {
  const day = dateKey();
  const u = (useApp.getState().usage ?? {}) as Partial<Record<string, unknown>>;
  if (u.day !== day) return { day, ai: 0, chat: 0, word: 0 };
  return { day, ai: Number(u.ai) || 0, chat: Number(u.chat) || 0, word: Number(u.word) || 0 };
}
const limitOf = (kind: Kind) => (kind === 'ai' ? LIMITS.aiScansPerDay : kind === 'chat' ? LIMITS.chatPerDay : LIMITS.wordAiPerDay);

export const quotaLeft = (kind: Kind) => (isMax() ? Infinity : Math.max(0, limitOf(kind) - today()[kind]));
/** Is there free quota left today? (Max: always.) */
export const hasQuota = (kind: Kind) => quotaLeft(kind) > 0;
/** Count one use — call only after the request succeeded, so failures don't eat the limit. */
export function spendQuota(kind: Kind) {
  if (isMax()) return;
  const u = today();
  useApp.setState({ usage: { ...u, [kind]: u[kind] + 1 } });
}

/** Free learns up to LIMITS.freeLanguages languages at once; Max up to LIMITS.maxLanguages. */
export function canAddLanguage(code: string) {
  const st = useApp.getState();
  if (st.settings.targets.includes(code as never)) return true;
  if (isMaxState(st)) return st.settings.targets.length < LIMITS.maxLanguages;
  if (st.settings.targets.length < LIMITS.freeLanguages) return true;
  return requireMax('languages');
}
export const topicOpen = (topic: Topic, max: boolean) => max || FREE_TOPICS.includes(topic);

/** Audiobooks: the easiest books of each language are open in Free; every other book needs Max. */
export function bookOpen(id: string, max: boolean) {
  if (max) return true;
  const b = bookById(id);
  if (!b) return false;
  return booksFor(b.lang).slice(0, LIMITS.freeBooksPerLang).some((x) => x.id === id);
}
export const chapterOpen = (id: string, _chapter: number, max: boolean) => bookOpen(id, max);
