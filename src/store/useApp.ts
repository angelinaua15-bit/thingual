import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getLocales } from 'expo-localization';
import { LangCode, LANGUAGES } from '../data/languages';
import { newCard, review as srsReview, StoredCard, Answer } from '../lib/srs';
import { dateKey, nicknameFor } from '../data/social';
import { conceptById, Place } from '../data/concepts';
import { needsPersist, persistPhoto } from '../lib/photoStore';
import { questsFor, CHEST_REWARD, type QuestField } from '../lib/quests';
import { LIMITS } from '../lib/limits';
import { addDays, DAILY_SPARKS, dayDiff, FLAMES, FlameId, MAX_FREEZES, MILESTONES, PRICES, REPAIR_WINDOW, Reward } from '../lib/streak';

export type Level = 'beginner' | 'intermediate' | 'advanced';
export type Goal = 'move' | 'travel' | 'study' | 'curious';
export type AgeGroup = 'under13' | 'teen' | 'adult';
export type WordSource = 'camera' | 'drop' | 'world' | 'quiz' | 'set' | 'gallery' | 'find';

export type SavedWord = {
  conceptId: string;
  photo: string;
  addedAt: number;
  place: Place | string;
  source: WordSource;
  note?: string;
  card: StoredCard;
  lapses: number;
};

export type Collection = { id: string; name: string; conceptIds: string[]; createdAt: number; isPublic?: boolean };

type Streak = { count: number; last?: string };
export type Celebration = { kind: 'daily'; count: number; sparks: number; at: number } | { kind: 'milestone'; days: number; reward: Reward; at: number };
export type ShopItem = 'freeze' | 'repair' | FlameId;

export type Settings = {
  theme: 'system' | 'light' | 'dark';
  uiLang: LangCode;
  native: LangCode;
  targets: LangCode[];
  active: LangCode;
  level: Level;
  dailyMinutes: 3 | 5 | 10 | 15;
  voice: 'female' | 'male';
  slowVoice: boolean;
  notify: { drop: boolean; review: boolean; friends: boolean; weekly: boolean; reviewHour: number };
  sounds: boolean;
  haptics: boolean;
  reduceMotion: boolean;
  weeklyFriendsSummary: boolean;
  mapStyle?: 'color' | 'satellite' | 'minimal';
  /** grammatical gender for first-person phrases (“I’m tired” → втомився / втомилася) */
  speakerGender?: 'male' | 'female';
};

type State = {
  hydrated: boolean;
  onboarded: boolean;
  goal?: Goal;
  quizScore?: number;
  settings: Settings;
  profile: { id: string; nickname: string; displayName?: string; pendingAvatar?: string; ageGroup?: AgeGroup; createdAt: number; termsAt?: number };
  words: Record<string, SavedWord>;
  collections: Collection[];
  history: { day: string; reviewed: number; correct: number; minutes: number }[];
  learnStreak: Streak;
  dropStreak: Streak;
  freezesUsedWeek: { week: string; used: number };
  bestStreak: number;
  activeDays: string[];
  frozenDays: string[];
  sparks: number;
  freezes: number;
  claimed: number[];
  lostStreak?: { count: number; day: string; last: string };
  flames: FlameId[];
  flame: FlameId;
  celebrate: Celebration | null;
  maxWaitlist?: 'monthly' | 'yearly' | 'family';
  /** saved phrases, phrasal verbs, collocations and idioms (spaced repetition) */
  exprs: Record<string, { card: StoredCard; addedAt: number }>;
  /** daily quests progress: day → counters + claimed quest ids */
  quests: { day: string; claimed: string[] } & Partial<Record<QuestField, number>>;
  /** sparks earned this ISO week (weekly league) */
  weekXp: { week: string; xp: number };
  /** Thingual Max active until (ms); trial or purchase */
  maxUntil?: number;
  trialUsed?: boolean;
  /** month (YYYY-MM) when Max last refilled streak freezes */
  maxFreezeMonth?: string;
  usage: { day: string; ai: number; chat: number; word?: number };
  /** My vocabulary: words the learner wrote themselves (abstract words, verbs…) */
  notebook: Record<string, NoteWord>;
  /** deleted notebook ids → time (so sync doesn't bring them back) */
  noteTomb: Record<string, number>;
  /** last time synced progress changed on this device (ms) */
  localChangedAt?: number;
  /** grammar lesson id → best score (0–100) */
  grammar: Record<string, number>;
  drops: Record<string, string>; // dateKey -> post id of my Daily Drop
  achievements: string[];
  familyMode: { enabled: boolean; pin?: string; childName?: string };
};

type Actions = {
  setHydrated: () => void;
  completeOnboarding: (p: { goal?: Goal; level: Level; native: LangCode; target: LangCode; quizScore: number; quizWords: string[] }) => void;
  updateSettings: (p: Partial<Settings>) => void;
  setActiveTarget: (l: LangCode) => void;
  addTarget: (l: LangCode) => void;
  removeTarget: (l: LangCode) => void;
  saveWord: (conceptId: string, photo: string, source: WordSource) => boolean;
  removeWord: (conceptId: string) => void;
  setNote: (conceptId: string, note: string) => void;
  answer: (conceptId: string, a: Answer) => void;
  logSession: (reviewed: number, correct: number, minutes: number) => void;
  createCollection: (name: string, conceptIds?: string[]) => string;
  toggleInCollection: (collectionId: string, conceptId: string) => void;
  deleteCollection: (id: string) => void;
  markDrop: (postId: string) => void;
  setAgeGroup: (a: AgeGroup) => void;
  setLocalProfile: (p: Partial<State['profile']>) => void;
  setFamilyMode: (p: State['familyMode']) => void;
  unlock: (id: string) => void;
  checkStreak: () => void;
  markActive: () => void;
  buy: (item: ShopItem) => 'ok' | 'funds' | 'max' | 'unavailable';
  setFlame: (f: FlameId) => void;
  clearCelebrate: () => void;
  setMaxWaitlist: (p: 'monthly' | 'yearly' | 'family') => void;
  toggleExpr: (id: string) => boolean;
  saveExprs: (ids: string[]) => number;
  answerExpr: (id: string, a: Answer) => void;
  questBump: (field: QuestField, n?: number) => void;
  claimQuest: (id: string) => number;
  finishGrammar: (id: string, score: number) => void;
  startTrial: () => boolean;
  addNote: (w: NoteInput) => string;
  updateNote: (id: string, patch: Partial<NoteInput & { done: boolean }>) => void;
  removeNote: (id: string) => void;
  toggleNoteDone: (id: string) => void;
  answerNote: (id: string, a: Answer) => void;
  resetAll: () => void;
};


export type NoteInput = {
  word: string;
  lang: LangCode;
  translation: string;
  ipa?: string;
  roman?: string | null;
  pos?: string;
  association?: string;
  example?: string;
  exampleTr?: string;
  emoji?: string;
  note?: string;
};
export type NoteWord = NoteInput & { id: string; done: boolean; createdAt: number; updatedAt: number; card: StoredCard };

const weekKey = (d = new Date()) => {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-W${Math.ceil(((t.getTime() - y.getTime()) / 86400000 + 1) / 7)}`;
};

/** Sparks earned also count toward this week’s league score. */
const addXp = (w: { week: string; xp: number }, n: number) => { const wk = weekKey(); return { week: wk, xp: (w.week === wk ? w.xp : 0) + n }; };

// calendar arithmetic, not 24 h: DST days are 23 or 25 hours long
const yesterdayKey = () => addDays(dateKey(), -1);

const detectLang = (): LangCode => {
  const code = getLocales()[0]?.languageCode ?? 'en';
  return (LANGUAGES.find((l) => l.code === code)?.code ?? 'en') as LangCode;
};

/** Daily Drop streak: consecutive days with a Drop. */
const bumpStreak = (s: Streak): Streak => {
  const today = dateKey();
  if (s.last === today) return s;
  if (s.last === yesterdayKey()) return { count: s.count + 1, last: today };
  return { count: 1, last: today };
};

const initialSettings = (): Settings => {
  const sys = detectLang();
  return {
    theme: 'system',
    uiLang: sys,
    native: sys,
    targets: [sys === 'en' ? 'es' : 'en'],
    active: sys === 'en' ? 'es' : 'en',
    level: 'beginner',
    dailyMinutes: 5,
    voice: 'female',
    slowVoice: false,
    notify: { drop: true, review: true, friends: true, weekly: true, reviewHour: 19 },
    sounds: true,
    haptics: true,
    reduceMotion: false,
    weeklyFriendsSummary: true,
  };
};

const initialState = (): State => {
  const id = `u-${Math.random().toString(36).slice(2, 10)}`;
  return {
    hydrated: false,
    onboarded: false,
    settings: initialSettings(),
    profile: { id, nickname: nicknameFor(id), createdAt: Date.now() },
    words: {},
    collections: [],
    history: [],
    learnStreak: { count: 0 },
    dropStreak: { count: 0 },
    freezesUsedWeek: { week: weekKey(), used: 0 },
    bestStreak: 0,
    activeDays: [],
    frozenDays: [],
    sparks: 0,
    freezes: 1,
    claimed: [],
    flames: ['classic'],
    flame: 'classic',
    celebrate: null,
    exprs: {},
    quests: { day: '', claimed: [] },
    weekXp: { week: weekKey(), xp: 0 },
    grammar: {},
    usage: { day: '', ai: 0, chat: 0 },
    notebook: {},
    noteTomb: {},
    drops: {},
    achievements: [],
    familyMode: { enabled: false },
  };
};

export const useApp = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...initialState(),

      setHydrated: () => set({ hydrated: true }),

      completeOnboarding: ({ goal, level, native, target, quizScore, quizWords }) => {
        set((s) => ({
          onboarded: true,
          goal,
          quizScore,
          settings: { ...s.settings, level, native, uiLang: native, targets: [target], active: target },
        }));
        quizWords.forEach((id) => {
          const c = conceptById(id);
          if (c) get().saveWord(id, '', 'quiz');
        });
      },

      updateSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),

      setActiveTarget: (l) => set((s) => ({ settings: { ...s.settings, active: l } })),

      addTarget: (l) =>
        set((s) => {
          if (s.settings.targets.includes(l)) return { settings: { ...s.settings, active: l } };
          return { settings: { ...s.settings, targets: [...s.settings.targets, l].slice(0, LIMITS.maxLanguages), active: l } };
        }),

      removeTarget: (l) =>
        set((s) => {
          const targets = s.settings.targets.filter((x) => x !== l);
          if (!targets.length) return {};
          return { settings: { ...s.settings, targets, active: targets.includes(s.settings.active) ? s.settings.active : targets[0] } };
        }),

      saveWord: (conceptId, photo, source) => {
        const c = conceptById(conceptId);
        if (!c) return false;
        const existing = get().words[conceptId];
        const keepPhoto = (p: string) => {
          if (!needsPersist(p)) return;
          persistPhoto(p).then((key) => {
            const w = get().words[conceptId];
            if (w && w.photo === p) set((s) => ({ words: { ...s.words, [conceptId]: { ...w, photo: key } } }));
          });
        };
        if (existing) {
          if (photo && !existing.photo) {
            set((s) => ({ words: { ...s.words, [conceptId]: { ...existing, photo } } }));
            keepPhoto(photo);
          }
          return false;
        }
        set((s) => ({
          words: {
            ...s.words,
            [conceptId]: { conceptId, photo, addedAt: Date.now(), place: c.place, source, card: newCard(), lapses: 0 },
          },
        }));
        keepPhoto(photo);
        if (source !== 'quiz') get().markActive();
        if (source !== 'quiz' && source !== 'set') get().questBump('words');
        if (photo && (source === 'camera' || source === 'gallery' || source === 'find')) get().questBump('photos');
        const n = Object.keys(get().words).length;
        if (n >= 1) get().unlock('first-word');
        if (n >= 25) get().unlock('25-words');
        if (n >= 100) get().unlock('100-words');
        return true;
      },

      removeWord: (conceptId) =>
        set((s) => {
          const words = { ...s.words };
          delete words[conceptId];
          return { words, collections: s.collections.map((c) => ({ ...c, conceptIds: c.conceptIds.filter((x) => x !== conceptId) })) };
        }),

      setNote: (conceptId, note) =>
        set((s) => (s.words[conceptId] ? { words: { ...s.words, [conceptId]: { ...s.words[conceptId], note } } } : {})),

      answer: (conceptId, a) =>
        set((s) => {
          const w = s.words[conceptId];
          if (!w) return {};
          return { words: { ...s.words, [conceptId]: { ...w, card: srsReview(w.card, a), lapses: w.lapses + (a === 'again' ? 1 : 0) } } };
        }),

      logSession: (reviewed, correct, minutes) => {
        set((s) => {
          const day = dateKey();
          const history = [...s.history];
          const i = history.findIndex((h) => h.day === day);
          if (i >= 0) history[i] = { day, reviewed: history[i].reviewed + reviewed, correct: history[i].correct + correct, minutes: history[i].minutes + minutes };
          else history.push({ day, reviewed, correct, minutes });
          // one spark per correct answer, up to 20 per session
          const earned = Math.min(correct, 20) * (s.maxUntil && s.maxUntil > Date.now() ? 2 : 1);
          return { history: history.slice(-120), sparks: s.sparks + earned, weekXp: addXp(s.weekXp, earned) };
        });
        if (reviewed > 0) { get().markActive(); get().questBump('reviews', reviewed); }
      },

      createCollection: (name, conceptIds = []) => {
        const id = `c-${Date.now().toString(36)}`;
        set((s) => ({ collections: [...s.collections, { id, name, conceptIds, createdAt: Date.now() }] }));
        return id;
      },

      toggleInCollection: (collectionId, conceptId) =>
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id !== collectionId
              ? c
              : { ...c, conceptIds: c.conceptIds.includes(conceptId) ? c.conceptIds.filter((x) => x !== conceptId) : [...c.conceptIds, conceptId] },
          ),
        })),

      deleteCollection: (id) => set((s) => ({ collections: s.collections.filter((c) => c.id !== id) })),

      markDrop: (postId) => {
        const s = get();
        if (s.drops[dateKey()]) return;
        const streak = bumpStreak(s.dropStreak);
        set({ dropStreak: streak, drops: { ...s.drops, [dateKey()]: postId } });
        get().markActive();
        get().questBump('drops');
        get().unlock('first-post');
        if (streak.count >= 30) get().unlock('drop-30');
      },

      setAgeGroup: (a) => set((s) => ({ profile: { ...s.profile, ageGroup: a } })),
      setLocalProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      setFamilyMode: (p) => set({ familyMode: p }),
      unlock: (id) => set((s) => (s.achievements.includes(id) ? {} : { achievements: [...s.achievements, id] })),
      /** Settle missed days: spend freezes automatically, or lose the streak (repairable for a while). */
      checkStreak: () => {
        const s0 = get();
        if (s0.flame === 'gold' && !s0.flames.includes('gold') && !(s0.maxUntil && s0.maxUntil > Date.now())) set({ flame: 'classic' });
        // Max: streak freezes are topped up every month
        const month = dateKey().slice(0, 7);
        if (s0.maxUntil && s0.maxUntil > Date.now() && s0.maxFreezeMonth !== month) {
          set({ maxFreezeMonth: month, freezes: Math.max(s0.freezes, Math.min(MAX_FREEZES + LIMITS.maxFreezesMonthly, s0.freezes + LIMITS.maxFreezesMonthly)) });
        }
        const s = get();
        const st = s.learnStreak;
        const today = dateKey();
        if (s.lostStreak && dayDiff(s.lostStreak.day, today) > REPAIR_WINDOW) set({ lostStreak: undefined });
        if (!st.last || st.count === 0) return;
        const gap = dayDiff(st.last, today);
        if (gap <= 1) return;
        const missed = gap - 1;
        if (missed <= s.freezes) {
          const days = Array.from({ length: missed }, (_, i) => addDays(st.last!, i + 1));
          set({ freezes: s.freezes - missed, frozenDays: [...s.frozenDays, ...days].slice(-200), learnStreak: { count: st.count, last: yesterdayKey() } });
        } else {
          // the streak broke on the first missed day — that's where the repair window starts
          set({ lostStreak: { count: st.count, day: addDays(st.last, 1), last: st.last }, learnStreak: { count: 0 } });
        }
      },

      /** Any real learning action today keeps the flame alive. */
      markActive: () => {
        get().checkStreak();
        const s = get();
        const today = dateKey();
        const st = s.learnStreak;
        if (st.last === today) return;
        const count = (st.last && dayDiff(st.last, today) === 1 ? st.count : 0) + 1;
        const mult = s.maxUntil && s.maxUntil > Date.now() ? 2 : 1;
        let sparks = s.sparks + DAILY_SPARKS * mult;
        let freezes = s.freezes;
        let flames = s.flames;
        const claimed = [...s.claimed];
        const m = MILESTONES.find((x) => x.days === count && !claimed.includes(x.days));
        let celebrate: Celebration = { kind: 'daily', count, sparks: DAILY_SPARKS * mult, at: Date.now() };
        if (m) {
          claimed.push(m.days);
          sparks += m.reward.sparks ?? 0;
          freezes = Math.min(MAX_FREEZES + 2, freezes + (m.reward.freezes ?? 0));
          if (m.reward.flame && !flames.includes(m.reward.flame)) flames = [...flames, m.reward.flame];
          celebrate = { kind: 'milestone', days: m.days, reward: m.reward, at: Date.now() };
        }
        const achievements = [...s.achievements];
        if (count >= 7 && !achievements.includes('streak-7')) achievements.push('streak-7');
        if (count >= 30 && !achievements.includes('streak-30')) achievements.push('streak-30');
        set({
          learnStreak: { count, last: today },
          bestStreak: Math.max(s.bestStreak, count),
          activeDays: [...s.activeDays.filter((d) => d !== today), today].slice(-400),
          sparks, freezes, flames, claimed, celebrate, achievements, weekXp: addXp(s.weekXp, sparks - s.sparks),
        });
      },

      buy: (item) => {
        const s = get();
        const today = dateKey();
        if (item === 'freeze') {
          if (s.freezes >= MAX_FREEZES) return 'max';
          if (s.sparks < PRICES.freeze) return 'funds';
          set({ sparks: s.sparks - PRICES.freeze, freezes: s.freezes + 1 });
          return 'ok';
        }
        if (item === 'repair') {
          const lost = s.lostStreak;
          if (!lost || dayDiff(lost.day, today) > REPAIR_WINDOW) return 'unavailable';
          if (s.sparks < PRICES.repair) return 'funds';
          const st = s.learnStreak;
          const current = st.last && dayDiff(st.last, today) <= 1 ? st.count : 0;
          // the missed days become frozen days so the calendar stays continuous
          const gap = Math.max(0, dayDiff(lost.last, today) - 1);
          const gapDays = Array.from({ length: gap }, (_, i) => addDays(lost.last, i + 1)).filter((d) => !s.activeDays.includes(d));
          const count = lost.count + current;
          set({
            sparks: s.sparks - PRICES.repair,
            lostStreak: undefined,
            learnStreak: current ? { count, last: st.last } : { count, last: yesterdayKey() },
            bestStreak: Math.max(s.bestStreak, count),
            frozenDays: [...s.frozenDays, ...gapDays].slice(-200),
          });
          return 'ok';
        }
        if (s.flames.includes(item)) return 'unavailable';
        const price = FLAMES[item].price;
        if (s.sparks < price) return 'funds';
        set({ sparks: s.sparks - price, flames: [...s.flames, item], flame: item });
        return 'ok';
      },

      // the gold flame comes with Max
      setFlame: (f) => set((s) => (s.flames.includes(f) || (f === 'gold' && !!s.maxUntil && s.maxUntil > Date.now()) ? { flame: f } : {})),
      clearCelebrate: () => set({ celebrate: null }),
      setMaxWaitlist: (p) => set({ maxWaitlist: p }),
      toggleExpr: (id) => {
        const has = !!get().exprs[id];
        set((s) => {
          const exprs = { ...s.exprs };
          if (has) delete exprs[id];
          else exprs[id] = { card: newCard(), addedAt: Date.now() };
          return { exprs };
        });
        return !has;
      },
      saveExprs: (ids) => {
        const fresh = ids.filter((id) => !get().exprs[id]);
        if (fresh.length) set((s) => ({ exprs: { ...s.exprs, ...Object.fromEntries(fresh.map((id) => [id, { card: newCard(), addedAt: Date.now() }])) } }));
        return fresh.length;
      },
      startTrial: () => {
        const s = get();
        if (s.trialUsed) return false;
        set({ trialUsed: true, maxUntil: Date.now() + LIMITS.trialDays * 86400000 });
        get().checkStreak();
        return true;
      },
      finishGrammar: (id, score) => {
        set((s) => ({ grammar: { ...s.grammar, [id]: Math.max(s.grammar[id] ?? 0, score) } }));
        get().questBump('grammar');
      },
      questBump: (field, n = 1) =>
        set((s) => {
          const day = dateKey();
          const q = s.quests.day === day ? s.quests : { day, claimed: [] };
          return { quests: { ...q, [field]: (q[field] ?? 0) + n } };
        }),
      claimQuest: (id) => {
        const s = get();
        const day = dateKey();
        if (s.quests.day !== day || s.quests.claimed.includes(id)) return 0;
        const list = questsFor(day);
        let reward = 0;
        if (id === 'chest') {
          if (!list.every((q) => s.quests.claimed.includes(q.id))) return 0;
          reward = CHEST_REWARD;
        } else {
          const q = list.find((x) => x.id === id);
          if (!q || (s.quests[q.field] ?? 0) < q.goal) return 0;
          reward = q.reward;
        }
        if (s.maxUntil && s.maxUntil > Date.now()) reward *= 2;
        set({ sparks: s.sparks + reward, weekXp: addXp(s.weekXp, reward), quests: { ...s.quests, claimed: [...s.quests.claimed, id] } });
        return reward;
      },
      addNote: (w) => {
        const id = `n-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
        const now = Date.now();
        set((s) => ({ notebook: { ...s.notebook, [id]: { ...w, id, done: false, createdAt: now, updatedAt: now, card: newCard() } } }));
        get().questBump('words');
        get().markActive();
        return id;
      },
      updateNote: (id, patch) =>
        set((s) => (s.notebook[id] ? { notebook: { ...s.notebook, [id]: { ...s.notebook[id], ...patch, updatedAt: Date.now() } } } : {})),
      removeNote: (id) =>
        set((s) => {
          const notebook = { ...s.notebook };
          delete notebook[id];
          return { notebook, noteTomb: { ...s.noteTomb, [id]: Date.now() } };
        }),
      toggleNoteDone: (id) =>
        set((s) => (s.notebook[id] ? { notebook: { ...s.notebook, [id]: { ...s.notebook[id], done: !s.notebook[id].done, updatedAt: Date.now() } } } : {})),
      answerNote: (id, a) => {
        get().questBump('reviews');
        set((s) => (s.notebook[id] ? { notebook: { ...s.notebook, [id]: { ...s.notebook[id], card: srsReview(s.notebook[id].card, a), updatedAt: Date.now() } } } : {}));
      },

      answerExpr: (id, a) => {
        get().questBump('phrases');
        set((s) => (s.exprs[id] ? { exprs: { ...s.exprs, [id]: { ...s.exprs[id], card: srsReview(s.exprs[id].card, a) } } } : {}));
      },

      // Max entitlement (maxUntil, trialUsed) belongs to the account and survives a reset
      resetAll: () => set({ ...initialState(), hydrated: true, lostStreak: undefined, goal: undefined, quizScore: undefined, maxFreezeMonth: undefined, maxWaitlist: undefined, localChangedAt: Date.now() }),
    }),
    {
      name: 'thingual-v1',
      version: 3,
      migrate: (persisted, version) => {
        const p = persisted as State & Actions;
        if (version < 3 && p?.learnStreak) {
          p.bestStreak = p.learnStreak.count;
          p.activeDays = p.learnStreak.last ? [p.learnStreak.last] : [];
          p.claimed = MILESTONES.filter((m) => m.days <= p.learnStreak.count).map((m) => m.days);
        }
        return p;
      },
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ hydrated, celebrate, ...rest }) => rest as unknown as State & Actions,
      onRehydrateStorage: () => () => {
        // also on a storage read error, so the app never stays on a blank screen
        setTimeout(() => {
          useApp.setState({ hydrated: true });
          migratePhotos();
        }, 0);
      },
    },
  ),
);

export { weekKey };

/** Move photos saved by older versions (base64 / blob: inside the state) out of localStorage. */
async function migratePhotos() {
  const words = useApp.getState().words;
  for (const w of Object.values(words)) {
    if (!needsPersist(w.photo)) continue;
    const key = await persistPhoto(w.photo);
    const cur = useApp.getState().words[w.conceptId];
    if (cur && cur.photo === w.photo) useApp.setState((s) => ({ words: { ...s.words, [w.conceptId]: { ...cur, photo: key } } }));
  }
}
