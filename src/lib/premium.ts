import { router } from 'expo-router';
import { useApp } from '../store/useApp';
import { dateKey } from '../data/social';
import type { Topic } from '../data/concepts';
import { LIMITS } from './limits';
export { LIMITS };

/**
 * Free vs Thingual Max. Free stays genuinely useful (camera, dictionary, reviews, Daily Drop, community);
 * Max removes limits on AI and opens the full course.
 */

export const FREE_SITUATIONS = ['basics', 'cafe', 'directions'];
export const FREE_TOPICS: Topic[] = ['food', 'fruits', 'kitchen', 'home', 'clothes', 'animals', 'nature', 'city'];
export const FREE_GRAMMAR_LEVELS = ['A1'];

export const isMaxState = (s: { maxUntil?: number }) => !!s.maxUntil && s.maxUntil > Date.now();
export const useIsMax = () => useApp((s) => isMaxState(s));
export const isMax = () => isMaxState(useApp.getState());

export type MaxReason = 'ai' | 'chat' | 'phrases' | 'english' | 'grammar' | 'topics' | 'bulk' | 'languages' | 'satellite' | 'flame';

/** Opens the Max page explaining what is locked. Returns true when the feature can be used. */
export function requireMax(reason: MaxReason) {
  if (isMax()) return true;
  router.push({ pathname: '/premium', params: { reason } });
  return false;
}

/** Daily counters for limited features; returns false when today's free limit is used up. */
export function takeQuota(kind: 'ai' | 'chat'): boolean {
  const st = useApp.getState();
  if (isMaxState(st)) return true;
  const day = dateKey();
  const u = st.usage.day === day ? st.usage : { day, ai: 0, chat: 0 };
  const limit = kind === 'ai' ? LIMITS.aiScansPerDay : LIMITS.chatPerDay;
  if (u[kind] >= limit) return false;
  useApp.setState({ usage: { ...u, [kind]: u[kind] + 1 } });
  return true;
}
export const quotaLeft = (kind: 'ai' | 'chat') => {
  const st = useApp.getState();
  if (isMaxState(st)) return Infinity;
  const u = st.usage.day === dateKey() ? st.usage : { ai: 0, chat: 0 };
  return (kind === 'ai' ? LIMITS.aiScansPerDay : LIMITS.chatPerDay) - u[kind];
};

/** Free learns up to LIMITS.freeLanguages languages at once; Max up to LIMITS.maxLanguages. */
export function canAddLanguage(code: string) {
  const st = useApp.getState();
  if (st.settings.targets.includes(code as never)) return true;
  if (isMaxState(st)) return st.settings.targets.length < LIMITS.maxLanguages;
  if (st.settings.targets.length < LIMITS.freeLanguages) return true;
  return requireMax('languages');
}
export const topicOpen = (topic: Topic, max: boolean) => max || FREE_TOPICS.includes(topic);
