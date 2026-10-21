import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type Grade } from 'ts-fsrs';

/** FSRS scheduler (open-source successor of SM-2 used by Anki). */
const scheduler = fsrs(generatorParameters({ enable_fuzz: true, request_retention: 0.9 }));

/** Card stored as JSON (dates as ISO strings). */
export type StoredCard = Omit<Card, 'due' | 'last_review'> & { due: string; last_review?: string };

export const newCard = (now = new Date()): StoredCard => toStored(createEmptyCard(now));

const toStored = (c: Card): StoredCard => ({
  ...c,
  due: new Date(c.due).toISOString(),
  last_review: c.last_review ? new Date(c.last_review).toISOString() : undefined,
});

const fromStored = (c: StoredCard): Card => {
  const card: Card = { ...c, due: new Date(c.due), last_review: c.last_review ? new Date(c.last_review) : undefined };
  // damaged or hand-edited memory state → start the card over instead of crashing the scheduler
  if (card.state === State.New || !(card.stability > 0) || !(card.difficulty >= 1)) {
    return { ...createEmptyCard(card.due), reps: card.reps ?? 0, lapses: card.lapses ?? 0 };
  }
  return card;
};

export type Answer = 'again' | 'hard' | 'good' | 'easy';
const GRADE: Record<Answer, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

export function review(card: StoredCard, answer: Answer, now = new Date()): StoredCard {
  const result = scheduler.next(fromStored(card), now, GRADE[answer]);
  return toStored(result.card);
}

/** Human readable "next review in …" for each answer — shown under the buttons. */
export function preview(card: StoredCard, now = new Date()): Record<Answer, number> {
  const out = {} as Record<Answer, number>;
  (Object.keys(GRADE) as Answer[]).forEach((a) => {
    const next = scheduler.next(fromStored(card), now, GRADE[a]).card;
    out[a] = new Date(next.due).getTime() - now.getTime();
  });
  return out;
}

export const isDue = (card: StoredCard, now = new Date()) => new Date(card.due).getTime() <= now.getTime();

/** Mastery level 0..3 shown as a ring around the photo: New → Familiar → Confident → Learned. */
export function mastery(card: StoredCard): 0 | 1 | 2 | 3 {
  if (card.state === State.New) return 0;
  if (card.state === State.Learning || card.state === State.Relearning) return 1;
  if (card.stability < 21) return 2;
  return 3;
}

export const formatInterval = (ms: number, t: (k: string, v?: Record<string, string | number>) => string) => {
  const min = Math.round(ms / 60000);
  if (min < 60) return t('time.min', { n: Math.max(1, min) });
  const h = Math.round(min / 60);
  if (h < 24) return t('time.hour', { n: h });
  const d = Math.round(h / 24);
  if (d < 31) return t('time.day', { n: d });
  return t('time.month', { n: Math.round(d / 30) });
};
