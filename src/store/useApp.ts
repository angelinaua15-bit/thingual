import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getLocales } from 'expo-localization';
import { LangCode, LANGUAGES } from '../data/languages';
import { newCard, review as srsReview, StoredCard, Answer } from '../lib/srs';
import { dateKey, nicknameFor } from '../data/social';
import { conceptById, Place } from '../data/concepts';

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
};

type State = {
  hydrated: boolean;
  onboarded: boolean;
  goal?: Goal;
  quizScore?: number;
  settings: Settings;
  profile: { id: string; nickname: string; displayName?: string; pendingAvatar?: string; ageGroup?: AgeGroup; createdAt: number };
  words: Record<string, SavedWord>;
  collections: Collection[];
  history: { day: string; reviewed: number; correct: number; minutes: number }[];
  learnStreak: Streak;
  dropStreak: Streak;
  freezesUsedWeek: { week: string; used: number };
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
  resetAll: () => void;
};

export const FREEZES_PER_WEEK = 1;

const weekKey = (d = new Date()) => {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-W${Math.ceil(((t.getTime() - y.getTime()) / 86400000 + 1) / 7)}`;
};

const yesterdayKey = () => dateKey(new Date(Date.now() - 86400000));

const detectLang = (): LangCode => {
  const code = getLocales()[0]?.languageCode ?? 'en';
  return (LANGUAGES.find((l) => l.code === code)?.code ?? 'en') as LangCode;
};

const bumpStreak = (s: Streak, freezes: State['freezesUsedWeek']): { streak: Streak; freezes: State['freezesUsedWeek'] } => {
  const today = dateKey();
  if (s.last === today) return { streak: s, freezes };
  if (s.last === yesterdayKey()) return { streak: { count: s.count + 1, last: today }, freezes };
  // missed exactly one day → spend a freeze if available
  const twoDays = dateKey(new Date(Date.now() - 2 * 86400000));
  const wk = weekKey();
  const used = freezes.week === wk ? freezes.used : 0;
  const allowed = FREEZES_PER_WEEK;
  if (s.last === twoDays && used < allowed) {
    return { streak: { count: s.count + 1, last: today }, freezes: { week: wk, used: used + 1 } };
  }
  return { streak: { count: 1, last: today }, freezes };
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
          return { settings: { ...s.settings, targets: [...s.settings.targets, l].slice(0, 5), active: l } };
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
        if (existing) {
          if (photo && !existing.photo) set((s) => ({ words: { ...s.words, [conceptId]: { ...existing, photo } } }));
          return false;
        }
        set((s) => ({
          words: {
            ...s.words,
            [conceptId]: { conceptId, photo, addedAt: Date.now(), place: c.place, source, card: newCard(), lapses: 0 },
          },
        }));
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

      logSession: (reviewed, correct, minutes) =>
        set((s) => {
          const day = dateKey();
          const history = [...s.history];
          const i = history.findIndex((h) => h.day === day);
          if (i >= 0) history[i] = { day, reviewed: history[i].reviewed + reviewed, correct: history[i].correct + correct, minutes: history[i].minutes + minutes };
          else history.push({ day, reviewed, correct, minutes });
          const { streak, freezes } = bumpStreak(s.learnStreak, s.freezesUsedWeek);
          const achievements = [...s.achievements];
          if (streak.count >= 7 && !achievements.includes('streak-7')) achievements.push('streak-7');
          return { history: history.slice(-120), learnStreak: streak, freezesUsedWeek: freezes, achievements };
        }),

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
        const { streak } = bumpStreak(s.dropStreak, s.freezesUsedWeek);
        set({ dropStreak: streak, drops: { ...s.drops, [dateKey()]: postId } });
        get().unlock('first-post');
        if (streak.count >= 30) get().unlock('drop-30');
      },

      setAgeGroup: (a) => set((s) => ({ profile: { ...s.profile, ageGroup: a } })),
      setLocalProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      setFamilyMode: (p) => set({ familyMode: p }),
      unlock: (id) => set((s) => (s.achievements.includes(id) ? {} : { achievements: [...s.achievements, id] })),
      resetAll: () => set({ ...initialState(), hydrated: true }),
    }),
    {
      name: 'thingual-v1',
      version: 2,
      migrate: (persisted) => persisted as State & Actions,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ hydrated, ...rest }) => rest as unknown as State & Actions,
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);

export { weekKey };
