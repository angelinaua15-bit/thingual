import { router } from 'expo-router';
import { supabase } from './supabase';
import { resetSession } from './api';
import { useApp, withLedger, crystalBalance } from '../store/useApp';
import type { StoredCard } from './srs';
import { spentOn } from '../data/wordPacks';
import { migratePathKeys } from '../data/path';

/**
 * Progress sync between devices (Supabase table user_state, one JSON row per account).
 * Words, phrases, streak, sparks, history and settings follow the account; on a conflict
 * cards keep the most recent review, lists are merged, and single values come from the newer side.
 */
type S = ReturnType<typeof useApp.getState>;
const KEYS = [
  'onboarded', 'goal', 'quizScore', 'settings', 'words', 'collections', 'history', 'learnStreak', 'dropStreak', 'bestStreak',
  'activeDays', 'frozenDays', 'sparks', 'freezes', 'claimed', 'flames', 'flame', 'achievements', 'exprs', 'drops', 'quests', 'weekXp', 'grammar', 'maxUntil', 'trialUsed', 'maxFreezeMonth', 'maxWaitlist', 'lostStreak', 'notebook', 'noteTomb', 'books', 'crystals', 'crystalEarn', 'unlocks', 'timeToday', 'path', 'lightningBest', 'stories', 'foxLook', 'mistakes',
] as const;
const QUIET: readonly string[] = ['timeToday', 'crystals', 'crystalEarn'];
type Snapshot = Partial<Pick<S, (typeof KEYS)[number]>> & { profile?: Partial<S['profile']> };

const portablePhoto = (p: string) => (p && /^https?:/.test(p) ? p : '');

function snapshot(s: S): Snapshot {
  const out: Record<string, unknown> = {};
  KEYS.forEach((k) => { out[k] = (s as unknown as Record<string, unknown>)[k]; });
  // photos stored only on this device can't travel; real (uploaded) photos can
  out.words = Object.fromEntries(Object.entries(s.words).map(([id, w]) => [id, { ...w, photo: portablePhoto(w.photo) }]));
  out.notebook = Object.fromEntries(Object.entries(s.notebook).map(([id, w]) => [id, { ...w, photo: w.photo ? portablePhoto(w.photo) || undefined : undefined }]));
  out.profile = { nickname: s.profile.nickname, displayName: s.profile.displayName, ageGroup: s.profile.ageGroup, termsAt: s.profile.termsAt };
  return out as Snapshot;
}

const reviewedAt = (c?: StoredCard) => (c?.last_review ? new Date(c.last_review).getTime() : 0) + (c?.reps ?? 0);
const union = <T,>(a: T[] = [], b: T[] = []) => [...new Set([...a, ...b])];

// same day → union of claimed quests and the higher counters (so a quest can't be claimed twice); else the later day
function mergeQuests(a: S['quests'], b?: S['quests']): S['quests'] {
  if (!b) return a;
  if (a.day !== b.day) return a.day > b.day ? a : b;
  const out: Record<string, unknown> = { ...b, ...a, claimed: union(a.claimed, b.claimed) };
  Object.keys(b).forEach((k) => { if (typeof (b as Record<string, unknown>)[k] === 'number') out[k] = Math.max(Number((a as Record<string, unknown>)[k] ?? 0), Number((b as Record<string, unknown>)[k])); });
  return out as S['quests'];
}

// My vocabulary: per word the later edit wins; deletions (tombstones) win over older edits
function mergeNotebook(local: S, remote: Snapshot) {
  const noteTomb = { ...(remote.noteTomb ?? {}), ...local.noteTomb };
  Object.entries(remote.noteTomb ?? {}).forEach(([id, t]) => { noteTomb[id] = Math.max(t, local.noteTomb[id] ?? 0); });
  const notebook = { ...local.notebook };
  Object.values(remote.notebook ?? {}).forEach((w) => {
    // photos from the gallery stay on the device they were taken on
    if (!notebook[w.id] || w.updatedAt > notebook[w.id].updatedAt) notebook[w.id] = { ...w, photo: w.photo || notebook[w.id]?.photo };
  });
  Object.keys(notebook).forEach((id) => { if (noteTomb[id] && noteTomb[id] >= notebook[id].updatedAt) delete notebook[id]; });
  return { notebook, noteTomb };
}

// crystals: per-device lifetime totals only grow, so the balance is recomputed instead of copied
function mergeCrystals(local: S, remote: Snapshot) {
  const mine = withLedger(local).crystalEarn;
  // a backup from before the ledger only has a balance: use it when this device has nothing yet
  const legacy: Record<string, number> = Object.keys(mine).length ? {} : remote.crystals ? { legacy: remote.crystals + spentOn(remote.unlocks) } : {};
  const theirs = remote.crystalEarn && Object.keys(remote.crystalEarn).length ? remote.crystalEarn : legacy;
  const crystalEarn: Record<string, number> = { ...theirs };
  Object.entries(mine).forEach(([d, n]) => { crystalEarn[d] = Math.max(n, crystalEarn[d] ?? 0); });
  const unlocks = union(local.unlocks, remote.unlocks);
  return { crystalEarn, unlocks, crystals: crystalBalance(crystalEarn, unlocks) };
}

// time gifts: same day → claimed ones stay claimed everywhere
function mergeTime(a: S['timeToday'], b?: S['timeToday']): S['timeToday'] {
  if (!b || !b.day) return a;
  if (a.day !== b.day) return a.day > b.day ? a : b;
  return { day: a.day, seconds: Math.max(a.seconds, b.seconds), earned: Math.max(a.earned, b.earned), claimed: union(a.claimed, b.claimed) };
}

const maxMerge = (a: Record<string, number> = {}, b: Record<string, number> = {}) =>
  Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(b)])].map((k) => [k, Math.max(a[k] ?? 0, b[k] ?? 0)]));

function merge(local: S, remote: Snapshot, remoteNewer: boolean): Partial<S> {
  const newer = <K extends keyof Snapshot>(k: K) => ((remoteNewer ? remote[k] : undefined) ?? (local as unknown as Snapshot)[k]);
  const words = { ...local.words };
  Object.entries(remote.words ?? {}).forEach(([id, w]) => {
    const mine = words[id];
    if (!mine || reviewedAt(w.card) > reviewedAt(mine.card)) words[id] = { ...w, photo: mine?.photo || w.photo };
  });
  const exprs = { ...local.exprs };
  Object.entries(remote.exprs ?? {}).forEach(([id, e]) => {
    if (!exprs[id] || reviewedAt(e.card) > reviewedAt(exprs[id].card)) exprs[id] = e;
  });
  const history = [...local.history];
  (remote.history ?? []).forEach((h) => {
    const i = history.findIndex((x) => x.day === h.day);
    if (i < 0) history.push(h);
    else history[i] = { day: h.day, reviewed: Math.max(h.reviewed, history[i].reviewed), correct: Math.max(h.correct, history[i].correct), minutes: Math.max(h.minutes, history[i].minutes) };
  });
  const streak = (a?: S['learnStreak'], b?: S['learnStreak']) => (!a ? b! : !b ? a : (a.last ?? '') > (b.last ?? '') ? a : (a.last ?? '') < (b.last ?? '') ? b : a.count >= b.count ? a : b);
  return {
    onboarded: local.onboarded || !!remote.onboarded,
    goal: newer('goal'),
    quizScore: newer('quizScore'),
    settings: { ...local.settings, ...(remoteNewer ? remote.settings : {}) },
    profile: { ...local.profile, ...(remoteNewer || !local.onboarded ? remote.profile : {}) },
    words,
    exprs,
    collections: newer('collections') ?? local.collections,
    history: history.sort((a, b) => a.day.localeCompare(b.day)).slice(-120),
    learnStreak: streak(local.learnStreak, remote.learnStreak),
    dropStreak: streak(local.dropStreak, remote.dropStreak),
    bestStreak: Math.max(local.bestStreak, remote.bestStreak ?? 0),
    activeDays: union(local.activeDays, remote.activeDays).sort().slice(-400),
    frozenDays: union(local.frozenDays, remote.frozenDays).sort().slice(-200),
    claimed: union(local.claimed, remote.claimed),
    flames: union(local.flames, remote.flames),
    achievements: union(local.achievements, remote.achievements),
    drops: { ...(remote.drops ?? {}), ...local.drops },
    sparks: remoteNewer ? remote.sparks ?? local.sparks : local.sparks,
    freezes: remoteNewer ? remote.freezes ?? local.freezes : local.freezes,
    flame: newer('flame') ?? local.flame,
    quests: mergeQuests(local.quests, remote.quests),
    ...mergeNotebook(local, remote),
    ...mergeCrystals(local, remote),
    timeToday: mergeTime(local.timeToday, remote.timeToday),
    lightningBest: maxMerge(local.lightningBest, remote.lightningBest),
    mistakes: { ...(remote.mistakes ?? {}), ...Object.fromEntries(Object.entries(local.mistakes ?? {}).filter(([k, v]) => !remote.mistakes?.[k] || v.at >= remote.mistakes[k].at)) },
    stories: maxMerge(local.stories, remote.stories),
    foxLook: remoteNewer ? remote.foxLook ?? local.foxLook : local.foxLook,
    path: maxMerge(migratePathKeys(local.path), migratePathKeys(remote.path)),
    books: Object.fromEntries(
      [...new Set([...Object.keys(local.books), ...Object.keys(remote.books ?? {})])].map((id) => {
        const a = local.books[id];
        const b = remote.books?.[id];
        const newer = !a ? b! : !b ? a : a.updatedAt >= b.updatedAt ? a : b;
        return [id, { ...newer, done: union(a?.done, b?.done) }];
      }),
    ),
    weekXp: (remote.weekXp && remote.weekXp.week === local.weekXp.week && remote.weekXp.xp > local.weekXp.xp) ? remote.weekXp : local.weekXp,
    grammar: Object.fromEntries(Object.entries({ ...(remote.grammar ?? {}), ...local.grammar }).map(([k, v]) => [k, Math.max(v, remote.grammar?.[k] ?? 0)])),
    maxWaitlist: local.maxWaitlist ?? remote.maxWaitlist,
    maxUntil: Math.max(local.maxUntil ?? 0, remote.maxUntil ?? 0) || undefined,
    trialUsed: local.trialUsed || remote.trialUsed,
    maxFreezeMonth: newer('maxFreezeMonth'),
    lostStreak: newer('lostStreak'),
  };
}

const changedAt = () => useApp.getState().localChangedAt ?? 0;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let applying = false;
let enabled = false;

async function push() {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return;
  const s = useApp.getState();
  await supabase.from('user_state').upsert({ user_id: data.session.user.id, data: snapshot(s), updated_at: new Date(changedAt() || Date.now()).toISOString() });
}

/** Pull the account's saved progress and merge it into this device. */
export async function pullState(): Promise<boolean> {
  const { data: auth } = await supabase.auth.getSession();
  const uid = auth.session?.user?.id;
  if (!uid) return false;
  const { data, error } = await supabase.from('user_state').select('data, updated_at').eq('user_id', uid).maybeSingle();
  enabled = true;
  if (error) return false;
  if (data?.data) {
    const remoteAt = new Date(data.updated_at).getTime();
    applying = true;
    useApp.setState({ ...merge(useApp.getState(), data.data as Snapshot, remoteAt > changedAt()), localChangedAt: Math.max(changedAt(), remoteAt) });
    applying = false;
  }
  push().catch(() => {});
  return !!data?.data;
}

const waitHydrated = () =>
  new Promise<void>((res) => {
    if (useApp.getState().hydrated) return res();
    const un = useApp.subscribe((s) => { if (s.hydrated) { un(); res(); } });
  });

/** Called once at start-up. */
export function initSync() {
  let prev = useApp.getState();
  useApp.subscribe((s) => {
    const p = prev;
    prev = s;
    // only real edits on this device count — not loading from storage or applying a pull
    if (applying || !s.hydrated || !p.hydrated) return;
    const changed = KEYS.filter((k) => (s as unknown as Record<string, unknown>)[k] !== (p as unknown as Record<string, unknown>)[k]);
    if (!changed.length) return;
    useApp.setState({ localChangedAt: Date.now() });
    if (!enabled) return;
    const run = () => { pushTimer = null; push().catch(() => {}); };
    // the time counter ticks every 10 s: batch those into one upload every 2 minutes
    if (changed.every((k) => QUIET.includes(k))) {
      if (!pushTimer) pushTimer = setTimeout(run, 120_000);
      return;
    }
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(run, 4000);
  });

  // a magic link opened on this device signs into the existing account → bring its progress here
  supabase.auth.onAuthStateChange((event, session) => {
    if (!session?.user || session.user.is_anonymous) return;
    if (event !== 'SIGNED_IN' && event !== 'INITIAL_SESSION') return;
    setTimeout(async () => {
      await waitHydrated();
      // INITIAL_SESSION fires on every start; only a not-yet-set-up device needs the restore here
      if (event === 'INITIAL_SESSION' && useApp.getState().onboarded) return;
      resetSession(session.user.id);
      const had = await pullState().catch(() => false);
      const { connect } = await import('./queries');
      connect();
      if (had && useApp.getState().onboarded) router.replace('/(tabs)/camera');
    }, 0);
  });
}
