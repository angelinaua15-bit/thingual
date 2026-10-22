import type { CEFR } from '../data/words/types';
import type { Level } from '../store/useApp';

/** CEFR level from the learner's settings (older installs only have the 3-step level). */
export const cefrOf = (s: { cefr?: CEFR; level: Level }): CEFR => s.cefr ?? (s.level === 'advanced' ? 'C1' : s.level === 'intermediate' ? 'B1' : 'A2');
/** the coarse 3-step level that some screens still use */
export const bucketOf = (c: CEFR): Level => (c === 'A1' || c === 'A2' ? 'beginner' : c === 'B1' || c === 'B2' ? 'intermediate' : 'advanced');
/** a quick guess from the 6-word onboarding quiz; the learner can change it right away */
export const cefrFromQuiz = (score: number, total: number): CEFR => {
  const r = score / Math.max(1, total);
  return r >= 1 ? 'B2' : r >= 0.8 ? 'B1' : r >= 0.5 ? 'A2' : 'A1';
};
export const CEFR_ORDER: CEFR[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
export const atOrBelow = (word: CEFR, learner: CEFR) => CEFR_ORDER.indexOf(word) <= CEFR_ORDER.indexOf(learner);
