import { router } from 'expo-router';
import { supabase } from './supabase';
import { resetSession } from './api';
import { useApp } from '../store/useApp';
import type { StoredCard } from './srs';

/**
 * Progress sync between devices (Supabase table user_state, one JSON row per account).
 * Words, phrases, streak, sparks, history and settings follow the account; on a conflict
 * cards keep the most recent review, lists are merged, and single values come from the newer side.
 */
type S = ReturnType<typeof useApp.getState>;
const KEYS = [
  'onboarded', 'goal', 'quizScore', 'settings', 'words', 'collections', 'history', 'learnStreak', 'dropStreak', 'bestStreak',
  'activeDays', 'frozenDays', 'sparks', 'freezes', 'claimed', 'flames', 'flame', 'achievements', 'exprs', 'drops', 'quests', 'weekXp', 'grammar', 'maxWaitlist', 'lostStreak',
] as const;
type Snapshot = Partial<Pick<S, (typeof KEYS)[number]>> & { profile?: Partial<S['profile']> };

const portablePhoto = (p: string) => (p && /^https?:/.test(p) ? p : '');

function snapshot(s: S): Snapshot {
  const out: Record<string, unknown> = {};
  KEYS.forEach((k) => { out[k] = (s as unknown as Record<string, unknown>)[k]; });
  // photos stored only on this device can't travel; real (uploaded) photos can
  out.words = Object.fromEntries(Object.entries(s.words).map(([id, w]) => [id, { ...w, photo: portablePhoto(w.photo) }]));
  out.profile = { nickname: s.profile.nickname, displayName: s.profile.displayName, ageGroup: s.profile.ageGroup, termsAt: s.profile.termsAt };
  return out as Snapshot;
}

const reviewedAt = (c?: StoredCard) => (c?.last_review ? new Date(c.last_review).getTime() : 0) + (c?.reps ?? 0);
const union = <T,>(a: T[] = [], b: T[] = []) => [...new Set([...a, ...b])];

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
    quests: newer('quests') ?? local.quests,
    weekXp: (remote.weekXp && remote.weekXp.week === local.weekXp.week && remote.weekXp.xp > local.weekXp.xp) ? remote.weekXp : local.weekXp,
    grammar: Object.fromEntries(Object.entries({ ...(remote.grammar ?? {}), ...local.grammar }).map(([k, v]) => [k, Math.max(v, remote.grammar?.[k] ?? 0)])),
    maxWaitlist: local.maxWaitlist ?? remote.maxWaitlist,
    lostStreak: newer('lostStreak'),
  };
}

let changedAt = 0;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let applying = false;
let enabled = false;

async function push() {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return;
  const s = useApp.getState();
  await supabase.from('user_state').upsert({ user_id: data.session.user.id, data: snapshot(s), updated_at: new Date(changedAt || Date.now()).toISOString() });
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
    useApp.setState(merge(useApp.getState(), data.data as Snapshot, remoteAt > changedAt));
    applying = false;
  }
  changedAt = Date.now();
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
    if (applying || !enabled) return;
    if (!KEYS.some((k) => (s as unknown as Record<string, unknown>)[k] !== (p as unknown as Record<string, unknown>)[k])) return;
    changedAt = Date.now();
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => push().catch(() => {}), 4000);
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
